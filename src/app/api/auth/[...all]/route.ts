import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { enforceRateLimit } from "@/server/rate-limit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
  try {
    // The hosting proxy is responsible for normalizing this header in production.
    // A user-agent fallback still constrains anonymous local requests.
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? request.headers.get("user-agent")
      ?? "anonymous";
    await enforceRateLimit("auth", address);
    return handlers.POST(request);
  } catch (error) {
    return errorResponse(error);
  }
}
