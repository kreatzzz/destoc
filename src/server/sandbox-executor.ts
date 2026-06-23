import { Sandbox } from "@vercel/sandbox";
import { AppError, asAppError } from "@/lib/errors";
import { requireProjectOwnership } from "@/server/authorization";
import { transitionSandboxRun } from "@/server/sandbox-runs";

const SANDBOX_TIMEOUT_MS = 15 * 60 * 1_000;
const INSTALL_TIMEOUT_MS = 4 * 60 * 1_000;
const PREVIEW_START_TIMEOUT_MS = SANDBOX_TIMEOUT_MS - 60_000;
const MAX_PERSISTED_LOG_LENGTH = 20_000;

type SandboxCredentials = {
  token: string;
  teamId: string;
  projectId: string;
};

/**
 * The Sandbox SDK receives platform credentials to create a VM, but no app
 * credentials are ever sent into the VM. The cloned repository is public and
 * all commands run with an empty environment supplied by this application.
 */
function getSandboxCredentials(): SandboxCredentials {
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

function truncateLog(value: string): string {
  return value.length <= MAX_PERSISTED_LOG_LENGTH
    ? value
    : `${value.slice(0, MAX_PERSISTED_LOG_LENGTH)}\n…output truncated`;
}

async function commandLog(command: { output(stream?: "stdout" | "stderr" | "both"): Promise<string> }) {
  return truncateLog(await command.output("both"));
}

async function waitForPreview(sandbox: Sandbox): Promise<string | undefined> {
  const ports = [3000, 5173] as const;
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    for (const port of ports) {
      const url = sandbox.domain(port);
      try {
        const response = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(2_000),
          redirect: "follow",
        });
        if (response.ok) return url;
      } catch {
        // The dev server may not have bound the port yet; keep polling.
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return undefined;
}

/**
 * Provisions and starts a public repository in an isolated Vercel Sandbox.
 *
 * The implementation intentionally uses only static shell programs. Repository
 * metadata is passed to the SDK as structured source fields rather than being
 * interpolated into a shell command. Network access is restricted to GitHub
 * and package registries during clone/install and then denied before the user
 * application starts.
 */
export async function executeSandboxRun(
  userId: string,
  input: { sandboxRunId: string; projectId: string; commitSha?: string },
) {
  const project = await requireProjectOwnership(input.projectId, userId);
  let logs = "";
  let sandbox: Sandbox | undefined;

  try {
    const credentials = getSandboxCredentials();
    await transitionSandboxRun(userId, input.sandboxRunId, "PROVISIONING");

    sandbox = await Sandbox.create({
      ...credentials,
      name: `destoc-${input.sandboxRunId}`,
      source: {
        type: "git",
        url: `${project.githubUrl}.git`,
        depth: 1,
        revision: input.commitSha ?? project.defaultBranch,
      },
      ports: [3000, 5173],
      runtime: "node24",
      env: { NODE_ENV: "development" },
      resources: { vcpus: 1 },
      timeout: SANDBOX_TIMEOUT_MS,
      persistent: false,
      networkPolicy: {
        allow: ["github.com", "*.github.com", "registry.npmjs.org", "*.npmjs.org"],
      },
    });

    await transitionSandboxRun(userId, input.sandboxRunId, "BUILDING", {
      logs: `Provisioned sandbox ${sandbox.name}. Installing project dependencies.`,
    });

    const install = await sandbox.runCommand({
      cmd: "sh",
      args: [
        "-lc",
        "if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi",
      ],
      timeoutMs: INSTALL_TIMEOUT_MS,
    });
    const installLog = await commandLog(install);
    logs = truncateLog(`Provisioned sandbox ${sandbox.name}.\n${installLog}`);

    if (install.exitCode !== 0) {
      throw new AppError("INTERNAL_ERROR", "Sandbox dependency installation failed.", {
        expose: false,
        cause: installLog,
      });
    }

    // The application must not have network egress after installation. It has
    // no app credentials in its environment either, so source code cannot read
    // the host application's secrets.
    await sandbox.updateNetworkPolicy("deny-all");

    await sandbox.runCommand({
      cmd: "sh",
      args: [
        "-lc",
        "npm run dev -- --hostname 0.0.0.0",
      ],
      detached: true,
      timeoutMs: PREVIEW_START_TIMEOUT_MS,
    });

    const previewUrl = await waitForPreview(sandbox);
    if (!previewUrl) {
      throw new AppError("INTERNAL_ERROR", "Sandbox preview did not start on a supported port.", {
        expose: false,
      });
    }

    return transitionSandboxRun(userId, input.sandboxRunId, "READY", {
      previewUrl,
      logs: truncateLog(`${logs}\nPreview ready at ${previewUrl}`),
    });
  } catch (error) {
    const appError = asAppError(error);
    const errorCode = appError.code === "INTERNAL_ERROR" ? "SANDBOX_EXECUTION_FAILED" : appError.code;
    const errorMessage = appError.expose ? appError.message : "Sandbox execution failed.";

    try {
      await transitionSandboxRun(userId, input.sandboxRunId, "FAILED", {
        errorCode,
        errorMessage,
        logs: logs || undefined,
      });
    } catch (transitionError) {
      // Preserve the original failure for the response; a concurrent worker may
      // have moved the run to a terminal state first.
      console.error("Failed to persist sandbox failure", transitionError);
    }

    if (sandbox) {
      await sandbox.stop().catch((stopError: unknown) => {
        console.error("Failed to stop sandbox after execution failure", stopError);
      });
    }

    throw error;
  }
}
