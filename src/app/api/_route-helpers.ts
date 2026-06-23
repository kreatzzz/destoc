import { AppError } from "@/lib/errors";

/**
 * Converts malformed JSON into the same public validation error shape as the
 * Zod schemas used by the server services. Route handlers should never leak a
 * parser exception to clients.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  const body = await request.text();

  if (!body.trim()) return {};

  try {
    return JSON.parse(body) as unknown;
  } catch (cause) {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", { cause });
  }
}
