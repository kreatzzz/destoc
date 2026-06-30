import { z } from "zod";

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const optionalString = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const commandArgsSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value, context) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
    } catch {
      // Report below as one consistent validation issue.
    }
    context.addIssue({
      code: "custom",
      message: "COMMAND_AI_ARGS must be a JSON array of strings",
    });
    return z.NEVER;
  });

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: optionalUrl,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal("")),
  ALLOW_IN_MEMORY_RATE_LIMIT: z.string().optional().transform((value) => value === "true"),
  REDIS_URL: optionalUrl,
  QUEUE_PREFIX: z.string().trim().min(1).max(80).optional().or(z.literal("")).transform((value) => value || "destoc"),
  WORKER_CONCURRENCY: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().int().min(1).max(4).default(1),
  ),
  VERCEL_TOKEN: z.string().optional().or(z.literal("")),
  BLOB_READ_WRITE_TOKEN: z.string().optional().or(z.literal("")),
  DESIGN_REVIEW_PROVIDER: z.enum(["mock", "deepseek", "local", "command"]).default("mock"),
  DEEPSEEK_API_KEY: optionalString,
  LOCAL_AI_BASE_URL: optionalUrl,
  LOCAL_AI_API_KEY: optionalString,
  LOCAL_AI_MODEL: z.string().optional().or(z.literal("")).transform((value) => value || "local-model"),
  COMMAND_AI_BIN: optionalString,
  COMMAND_AI_ARGS: commandArgsSchema,
  COMMAND_AI_TIMEOUT_MS: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().int().min(1_000).max(300_000).default(120_000),
  ),
  ALLOW_COMMAND_REVIEW_PROVIDER: z.string().optional().transform((value) => value === "true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

/**
 * Validates server configuration lazily. Lazy evaluation keeps static builds from
 * connecting to infrastructure while still failing closed when a server feature runs.
 */
export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      ALLOW_IN_MEMORY_RATE_LIMIT: process.env.ALLOW_IN_MEMORY_RATE_LIMIT,
      REDIS_URL: process.env.REDIS_URL,
      QUEUE_PREFIX: process.env.QUEUE_PREFIX,
      WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
      VERCEL_TOKEN: process.env.VERCEL_TOKEN,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      DESIGN_REVIEW_PROVIDER: process.env.DESIGN_REVIEW_PROVIDER,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      LOCAL_AI_BASE_URL: process.env.LOCAL_AI_BASE_URL,
      LOCAL_AI_API_KEY: process.env.LOCAL_AI_API_KEY,
      LOCAL_AI_MODEL: process.env.LOCAL_AI_MODEL,
      COMMAND_AI_BIN: process.env.COMMAND_AI_BIN,
      COMMAND_AI_ARGS: process.env.COMMAND_AI_ARGS,
      COMMAND_AI_TIMEOUT_MS: process.env.COMMAND_AI_TIMEOUT_MS,
      ALLOW_COMMAND_REVIEW_PROVIDER: process.env.ALLOW_COMMAND_REVIEW_PROVIDER,
    });
  }

  return cachedEnv;
}

export function hasUpstashConfiguration(env = getServerEnv()): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}
