import { SandboxRunStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireProjectOwnership } from "@/server/authorization";
import { enforceRateLimit } from "@/server/rate-limit";

const allowedTransitions: Record<SandboxRunStatus, readonly SandboxRunStatus[]> = {
  QUEUED: ["PROVISIONING", "FAILED", "STOPPED"],
  PROVISIONING: ["BUILDING", "FAILED", "STOPPED"],
  BUILDING: ["READY", "FAILED", "STOPPED"],
  READY: ["STOPPED", "FAILED"],
  FAILED: [],
  STOPPED: [],
};

export async function queueSandboxRun(userId: string, projectId: string, commitSha?: string) {
  await enforceRateLimit("sandbox", userId);
  await requireProjectOwnership(projectId, userId);

  return getPrisma().sandboxRun.create({
    data: { projectId, commitSha, status: "QUEUED" },
  });
}

export async function transitionSandboxRun(
  userId: string,
  sandboxRunId: string,
  nextStatus: SandboxRunStatus,
  metadata: {
    commitSha?: string;
    previewUrl?: string;
    logs?: string;
    errorCode?: string;
    errorMessage?: string;
  } = {},
) {
  const run = await getPrisma().sandboxRun.findFirst({
    where: { id: sandboxRunId, project: { workspace: { userId } } },
  });

  if (!run) throw new AppError("NOT_FOUND", "Sandbox run not found.");
  if (!allowedTransitions[run.status].includes(nextStatus)) {
    throw new AppError("CONFLICT", `Cannot transition a ${run.status} sandbox run to ${nextStatus}.`);
  }

  const now = new Date();
  return getPrisma().sandboxRun.update({
    where: { id: run.id },
    data: {
      status: nextStatus,
      ...metadata,
      startedAt: nextStatus === "PROVISIONING" ? now : undefined,
      stoppedAt: nextStatus === "STOPPED" || nextStatus === "FAILED" ? now : undefined,
    },
  });
}

export async function updateSandboxRunProgress(
  userId: string,
  sandboxRunId: string,
  metadata: {
    logs?: string;
    errorCode?: string;
    errorMessage?: string;
  },
) {
  const run = await getPrisma().sandboxRun.findFirst({
    where: { id: sandboxRunId, project: { workspace: { userId } } },
  });
  if (!run) throw new AppError("NOT_FOUND", "Sandbox run not found.");

  return getPrisma().sandboxRun.update({
    where: { id: run.id },
    data: metadata,
  });
}

export async function probeSandboxRunHealth(userId: string, projectId: string, sandboxRunId: string) {
  await requireProjectOwnership(projectId, userId);

  const run = await getPrisma().sandboxRun.findFirst({
    where: { id: sandboxRunId, projectId },
  });
  if (!run) throw new AppError("NOT_FOUND", "Sandbox run not found.");

  if (run.status !== "READY" || !run.previewUrl) {
    return { sandboxRun: run, reachable: false, stopped: run.status === "STOPPED" };
  }

  try {
    const response = await fetch(run.previewUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
    });

    if (response.status === 410 || response.status === 404) {
      const stoppedRun = await transitionSandboxRun(userId, run.id, "STOPPED", {
        errorCode: "SANDBOX_STOPPED",
        errorMessage: "The sandbox preview has expired. Start a new preview to continue.",
      });
      return { sandboxRun: stoppedRun, reachable: false, stopped: true, httpStatus: response.status };
    }

    return {
      sandboxRun: run,
      reachable: response.status < 600,
      stopped: false,
      httpStatus: response.status,
    };
  } catch {
    return { sandboxRun: run, reachable: false, stopped: false };
  }
}
