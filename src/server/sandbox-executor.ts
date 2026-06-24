import { Sandbox } from "@vercel/sandbox";
import { AppError, asAppError } from "@/lib/errors";
import { requireProjectOwnership } from "@/server/authorization";
import { createPreviewBridgeProxyScript } from "@/server/preview-bridge";
import { transitionSandboxRun } from "@/server/sandbox-runs";

// A preview is interactive product work, not a short command. Keep it alive
// for the maximum Hobby-safe window so a reviewer is not interrupted mid-audit.
const SANDBOX_TIMEOUT_MS = 45 * 60 * 1_000;
const INSTALL_TIMEOUT_MS = 4 * 60 * 1_000;
const PREVIEW_START_TIMEOUT_MS = SANDBOX_TIMEOUT_MS - 60_000;
const PREVIEW_HEALTH_CHECK_TIMEOUT_MS = 60_000;
const MAX_PERSISTED_LOG_LENGTH = 20_000;
const PREVIEW_LOG_FILE = ".destoc-preview.log";

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

async function waitForPreview(sandbox: Sandbox, ports: readonly number[]): Promise<{ url: string; port: number } | undefined> {
  const deadline = Date.now() + PREVIEW_HEALTH_CHECK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    for (const port of ports) {
      const url = sandbox.domain(port);
      try {
        const response = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(2_000),
          redirect: "follow",
        });
        // A 4xx/5xx response proves that the proxy is bound. The preview may
        // legitimately render an application-level error due to a missing
        // repository environment variable, but the workspace should still be
        // able to display that error rather than reporting a false startup
        // failure.
        if (response.status < 600) return { url, port };
      } catch {
        // The dev server may not have bound the port yet; keep polling.
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return undefined;
}

/**
 * Health-check the application over loopback so raw framework ports never
 * need public Sandbox routes. Only the injection proxy is externally exposed.
 */
async function waitForLocalPreview(sandbox: Sandbox, ports: readonly number[]): Promise<number | undefined> {
  const deadline = Date.now() + PREVIEW_HEALTH_CHECK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    for (const port of ports) {
      const check = await sandbox.runCommand({
        cmd: "node",
        args: [
          "-e",
          `fetch(\"http://127.0.0.1:${port}\", { redirect: \"follow\", signal: AbortSignal.timeout(2000) }).then(() => process.exit(0)).catch(() => process.exit(1))`,
        ],
        timeoutMs: 3_000,
      });
      if (check.exitCode === 0) return port;
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return undefined;
}

async function readPreviewLog(sandbox: Sandbox): Promise<string> {
  try {
    return truncateLog(await sandbox.fs.readFile(`${sandbox.cwd}/${PREVIEW_LOG_FILE}`, "utf8"));
  } catch {
    return "Preview server did not produce a log file.";
  }
}

function appendLog(existingLogs: string, nextLog: string): string {
  return truncateLog(`${existingLogs}\n${nextLog}`);
}

async function startPreviewBridge(sandbox: Sandbox, upstreamPort: number) {
  const bridgePath = `${sandbox.cwd}/.destoc-preview-bridge.cjs`;
  await sandbox.fs.writeFile(bridgePath, createPreviewBridgeProxyScript(upstreamPort), "utf8");

  await sandbox.runCommand({
    cmd: "node",
    args: [bridgePath],
    detached: true,
    timeoutMs: PREVIEW_START_TIMEOUT_MS,
  });

  const proxy = await waitForPreview(sandbox, [3001]);
  if (!proxy) {
    throw new AppError("INTERNAL_ERROR", "Sandbox preview bridge did not start.", {
      expose: false,
    });
  }

  return proxy.url;
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
      // Only the Destoc-owned reverse proxy is publicly exposed. The user app
      // remains reachable solely over localhost inside the VM.
      ports: [3001],
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
        // Dependency lifecycle scripts are required by a number of legitimate
        // web projects. They run only inside the disposable microVM, before
        // app execution, with no host credentials and tightly scoped egress.
        "if [ -f package-lock.json ]; then npm ci; else npm install; fi",
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
        `exec npm run dev -- --hostname 0.0.0.0 --port 3000 > ${PREVIEW_LOG_FILE} 2>&1`,
      ],
      cwd: sandbox.cwd,
      detached: true,
      timeoutMs: PREVIEW_START_TIMEOUT_MS,
    });

    const upstreamPort = await waitForLocalPreview(sandbox, [3000, 5173]);
    if (!upstreamPort) {
      logs = appendLog(logs, `Preview startup log:\n${await readPreviewLog(sandbox)}`);
      throw new AppError(
        "INTERNAL_ERROR",
        "Preview did not start. Confirm the repository has a runnable npm dev script; its sandbox startup log was saved.",
        { expose: true },
      );
    }

    const previewUrl = await startPreviewBridge(sandbox, upstreamPort);

    return transitionSandboxRun(userId, input.sandboxRunId, "READY", {
      previewUrl,
      logs: appendLog(logs, `Preview bridge ready at ${previewUrl} (upstream port ${upstreamPort})`),
    });
  } catch (error) {
    const appError = asAppError(error);
    const errorCode = appError.code === "INTERNAL_ERROR" ? "SANDBOX_EXECUTION_FAILED" : appError.code;
    const errorMessage = appError.expose ? appError.message : "Sandbox execution failed.";

    if (sandbox && !logs.includes("Preview startup log:")) {
      logs = appendLog(logs, `Preview startup log:\n${await readPreviewLog(sandbox)}`);
    }

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
