import { AppError } from "@/lib/errors";

const PROMPT_ALLOWED_EMAIL = "mkg245108@gmail.com";

export function assertPromptAccess(email: string): void {
  if (email.trim().toLowerCase() === PROMPT_ALLOWED_EMAIL) return;

  throw new AppError(
    "FORBIDDEN",
    "AI prompting is currently limited to the project owner.",
  );
}
