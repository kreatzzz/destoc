import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";

import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";

export const DESTOC_JOB_QUEUE = "destoc-background-jobs";

export type SandboxExecutionJob = {
  kind: "sandbox.execute";
  userId: string;
  projectId: string;
  sandboxRunId: string;
  commitSha?: string;
};

export type RevisionApplicationJob = {
  kind: "revision.apply";
  userId: string;
  projectId: string;
  sandboxRunId: string;
  revisionId: string;
  patch: string;
};

export type ReviewExecutionJob = {
  kind: "review.execute";
  userId: string;
  reviewId: string;
};

export type DestocJobData = SandboxExecutionJob | RevisionApplicationJob | ReviewExecutionJob;
export type DestocJobName = DestocJobData["kind"];

const retainedJobOptions: JobsOptions = {
  attempts: 1,
  removeOnComplete: { age: 60 * 60, count: 100 },
  removeOnFail: { age: 24 * 60 * 60, count: 500 },
};

const globalForQueue = globalThis as unknown as {
  destocJobQueue?: Queue<
    DestocJobData,
    void,
    DestocJobName,
    DestocJobData,
    void,
    DestocJobName
  >;
};

function requireRedisUrl() {
  const env = getServerEnv();
  const redisUrl = env.REDIS_URL ?? (env.NODE_ENV === "production" ? undefined : "redis://127.0.0.1:6379");
  if (!redisUrl) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "REDIS_URL is required to enqueue background sandbox work.",
    );
  }
  return redisUrl;
}

function producerRedis(): ConnectionOptions {
  return {
    url: requireRedisUrl(),
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  };
}

export function createWorkerRedisConnection(): ConnectionOptions {
  return {
    url: requireRedisUrl(),
    maxRetriesPerRequest: null,
  };
}

export function getDestocJobQueue() {
  if (globalForQueue.destocJobQueue) return globalForQueue.destocJobQueue;

  const queue = new Queue<
    DestocJobData,
    void,
    DestocJobName,
    DestocJobData,
    void,
    DestocJobName
  >(DESTOC_JOB_QUEUE, {
    connection: producerRedis(),
    prefix: getServerEnv().QUEUE_PREFIX,
    defaultJobOptions: retainedJobOptions,
  });
  queue.on("error", (error) => {
    console.error("BullMQ queue error", error);
  });
  globalForQueue.destocJobQueue = queue;
  return queue;
}

export async function enqueueSandboxExecution(job: Omit<SandboxExecutionJob, "kind">) {
  return getDestocJobQueue().add(
    "sandbox.execute",
    { kind: "sandbox.execute", ...job },
    { jobId: `sandbox-${job.sandboxRunId}` },
  );
}

export async function enqueueRevisionApplication(job: Omit<RevisionApplicationJob, "kind">) {
  return getDestocJobQueue().add(
    "revision.apply",
    { kind: "revision.apply", ...job },
    // Failed revisions may be explicitly retried with the same database ID.
    { jobId: `revision-${job.revisionId}-${Date.now()}` },
  );
}

export async function enqueueReviewExecution(job: Omit<ReviewExecutionJob, "kind">) {
  return getDestocJobQueue().add(
    "review.execute",
    { kind: "review.execute", ...job },
    { jobId: `review-${job.reviewId}` },
  );
}
