import { Worker } from "bullmq";

import { getServerEnv } from "@/lib/env";
import {
  createWorkerRedisConnection,
  DESTOC_JOB_QUEUE,
  type DestocJobData,
  type DestocJobName,
} from "@/server/job-queue";
import {
  applyPatchToExistingSandboxRun,
  executeSandboxRun,
  recoverInterruptedSandboxExecution,
} from "@/server/sandbox-executor";
import { recoverInterruptedRevision } from "@/server/revisions";
import { executeReview, recoverInterruptedReview } from "@/server/reviews";

const env = getServerEnv();
const connection = createWorkerRedisConnection();

const worker = new Worker<DestocJobData, void, DestocJobName>(
  DESTOC_JOB_QUEUE,
  async (job) => {
    if (job.data.kind === "sandbox.execute") {
      const shouldExecute = await recoverInterruptedSandboxExecution(
        job.data.userId,
        job.data.sandboxRunId,
      );
      if (!shouldExecute) return;

      await executeSandboxRun(job.data.userId, {
        sandboxRunId: job.data.sandboxRunId,
        projectId: job.data.projectId,
        commitSha: job.data.commitSha,
      });
      return;
    }

    if (job.data.kind === "review.execute") {
      const shouldExecute = await recoverInterruptedReview(job.data.userId, job.data.reviewId);
      if (!shouldExecute) return;
      await executeReview(job.data.userId, job.data.reviewId);
      return;
    }

    if (job.data.kind === "revision.apply") {
      const shouldApply = await recoverInterruptedRevision(
        job.data.userId,
        job.data.revisionId,
      );
      if (!shouldApply) return;

      await applyPatchToExistingSandboxRun(job.data.userId, {
        projectId: job.data.projectId,
        sandboxRunId: job.data.sandboxRunId,
        revisionId: job.data.revisionId,
        patch: job.data.patch,
      });
    }
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 120_000,
    maxStalledCount: 1,
    prefix: env.QUEUE_PREFIX,
  },
);

worker.on("ready", () => {
  console.log(`Destoc worker ready with concurrency ${worker.concurrency}.`);
});
worker.on("completed", (job) => {
  console.log(`Destoc job ${job.id ?? job.name} completed.`);
});
worker.on("failed", (job, error) => {
  console.error(`Destoc job ${job?.id ?? job?.name ?? "unknown"} failed.`, error);
});
worker.on("stalled", (jobId) => {
  console.warn(`Destoc job ${jobId} stalled and will be recovered by BullMQ.`);
});
worker.on("error", (error) => {
  console.error("Destoc worker error", error);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; closing Destoc worker.`);
  await worker.close();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
