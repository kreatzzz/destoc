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
