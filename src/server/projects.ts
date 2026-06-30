import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createProjectSchema,
  createWorkspaceSchema,
  type CreateProjectInput,
} from "@/lib/schemas";
import { requireProjectOwnership, requireWorkspaceOwnership } from "@/server/authorization";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  assessRepositoryPreviewCapability,
  isRepositoryPackageManifest,
  type RepositoryPackageManifest,
} from "@/server/repository-capabilities";

async function verifyPublicGitHubRepository(owner: string, repository: string, branch: string) {
  const repoResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "destoc-repository-import" },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);

  if (!repoResponse) {
    throw new AppError("VALIDATION_ERROR", "Could not reach GitHub to verify this repository. Try again in a moment.");
  }

  if (repoResponse.status === 404) {
    throw new AppError("VALIDATION_ERROR", "That public GitHub repository was not found. Check the owner, repository name, and visibility.");
  }

  if (!repoResponse.ok) {
    throw new AppError("VALIDATION_ERROR", `GitHub could not verify this repository right now (HTTP ${repoResponse.status}).`);
  }

  const branchResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/branches/${encodeURIComponent(branch)}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "destoc-repository-import" },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);

  if (!branchResponse) {
    throw new AppError("VALIDATION_ERROR", "Could not verify the repository branch. Try again in a moment.");
  }

  if (branchResponse.status === 404) {
    throw new AppError("VALIDATION_ERROR", `The branch “${branch}” was not found in this repository.`);
  }

  if (!branchResponse.ok) {
    throw new AppError("VALIDATION_ERROR", `GitHub could not verify this branch right now (HTTP ${branchResponse.status}).`);
  }

  const packageResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/package.json?ref=${encodeURIComponent(branch)}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "destoc-repository-import" },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);

  if (!packageResponse) {
    throw new AppError("VALIDATION_ERROR", "Could not inspect this repository for preview compatibility. Try again in a moment.");
  }

  if (packageResponse.status === 404) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Destoc currently previews Node-based web apps with a package.json at the repository root. This repository does not match that shape.",
    );
  }

  if (!packageResponse.ok) {
    throw new AppError("VALIDATION_ERROR", `GitHub could not inspect this repository for preview compatibility (HTTP ${packageResponse.status}).`);
  }

  const packagePayload = await packageResponse.json().catch(() => null) as { content?: string; encoding?: string } | null;
  if (!packagePayload?.content || packagePayload.encoding !== "base64") {
    throw new AppError("VALIDATION_ERROR", "Destoc could not read this repository’s package.json.");
  }

  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(Buffer.from(packagePayload.content, "base64").toString("utf8"));
  } catch {
    throw new AppError("VALIDATION_ERROR", "This repository has an invalid package.json, so Destoc cannot preview it.");
  }
  if (!isRepositoryPackageManifest(parsedManifest)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This repository’s package.json does not have a supported object structure.",
    );
  }
  const manifest: RepositoryPackageManifest = parsedManifest;

  const capability = assessRepositoryPreviewCapability(manifest);
  if (!capability.supported) {
    throw new AppError("VALIDATION_ERROR", capability.reason ?? "This repository cannot run in a Destoc preview.");
  }
}

export async function createWorkspace(userId: string, input: unknown) {
  await enforceRateLimit("mutation", userId);
  const { name } = createWorkspaceSchema.parse(input);

  return getPrisma().workspace.create({
    data: { userId, name },
  });
}

export async function listWorkspaces(userId: string) {
  return getPrisma().workspace.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { projects: true } },
    },
  });
}

export async function createProject(userId: string, input: CreateProjectInput | unknown) {
  await enforceRateLimit("mutation", userId);
  const parsed = createProjectSchema.parse(input);
  await requireWorkspaceOwnership(parsed.workspaceId, userId);
  await verifyPublicGitHubRepository(parsed.githubUrl.owner, parsed.githubUrl.repository, parsed.defaultBranch);

  try {
    return await getPrisma().project.create({
      data: {
        workspaceId: parsed.workspaceId,
        name: parsed.githubUrl.repository,
        githubUrl: parsed.githubUrl.url,
        repositoryOwner: parsed.githubUrl.owner,
        repositoryName: parsed.githubUrl.repository,
        defaultBranch: parsed.defaultBranch,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "That repository is already connected to this workspace.", {
        cause: error,
      });
    }
    throw error;
  }
}

export async function getProject(userId: string, projectId: string) {
  await requireProjectOwnership(projectId, userId);

  return getPrisma().project.findFirstOrThrow({
    where: { id: projectId },
    include: {
      sandboxRuns: { orderBy: { createdAt: "desc" }, take: 1 },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { suggestions: { orderBy: { createdAt: "asc" } } },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { beforeScreenshot: true, afterScreenshot: true },
      },
    },
  });
}

/**
 * Disconnect a repository from a workspace and permanently remove all of its
 * Destoc-owned records. Projects only store public GitHub metadata, so this
 * never mutates the source repository on GitHub.
 */
export async function deleteProject(userId: string, projectId: string) {
  await enforceRateLimit("mutation", userId);
  const project = await requireProjectOwnership(projectId, userId);

  try {
    await getPrisma().project.delete({
      where: { id: project.id },
    });
  } catch (error) {
    // A concurrent delete after the ownership check should preserve the
    // endpoint's not-found semantics instead of surfacing as a server error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError("NOT_FOUND", "Project not found.", { cause: error });
    }
    throw error;
  }

  return { id: project.id };
}

export async function listProjects(userId: string, workspaceId: string) {
  await requireWorkspaceOwnership(workspaceId, userId);

  return getPrisma().project.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    include: {
      sandboxRuns: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { reviews: true, revisions: true } },
    },
  });
}
