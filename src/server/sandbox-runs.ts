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
