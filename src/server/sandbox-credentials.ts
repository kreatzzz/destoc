import { AppError } from "@/lib/errors";

export type SandboxCredentials = {
  token: string;
  teamId: string;
  projectId: string;
};

export function getSandboxCredentials(): SandboxCredentials {
  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();

  if (!token || !teamId || !projectId) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Sandbox execution requires VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID.",
    );
  }

  return { token, teamId, projectId };
}
