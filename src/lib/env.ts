import { z } from "zod";

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: optionalUrl,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal("")),
  VERCEL_TOKEN: z.string().optional().or(z.literal("")),
  BLOB_READ_WRITE_TOKEN: z.string().optional().or(z.literal("")),
  DESIGN_REVIEW_PROVIDER: z.enum(["mock", "deepseek"]).default("mock"),
  DEEPSEEK_API_KEY: z.string().optional().or(z.literal("")),
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
      VERCEL_TOKEN: process.env.VERCEL_TOKEN,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      DESIGN_REVIEW_PROVIDER: process.env.DESIGN_REVIEW_PROVIDER,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    });
  }

  return cachedEnv;
}

export function hasUpstashConfiguration(env = getServerEnv()): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}
