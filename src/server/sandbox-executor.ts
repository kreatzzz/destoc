import { Sandbox } from "@vercel/sandbox";
import { getPrisma } from "@/lib/db";
import { AppError, asAppError } from "@/lib/errors";
import { requireProjectOwnership } from "@/server/authorization";
import { normalizeUnifiedDiff } from "@/server/patches";
import { createPreviewBridgeProxyScript } from "@/server/preview-bridge";
import { getSandboxCredentials } from "@/server/sandbox-credentials";
import { transitionSandboxRun, updateSandboxRunProgress } from "@/server/sandbox-runs";
import { transitionRevision } from "@/server/revisions";

// A preview is interactive product work, not a short command. Keep it alive
// for the maximum Hobby-safe window so a reviewer is not interrupted mid-audit.
const SANDBOX_TIMEOUT_MS = 45 * 60 * 1_000;
const INSTALL_TIMEOUT_MS = 4 * 60 * 1_000;
const BUILD_TIMEOUT_MS = 3 * 60 * 1_000;
const PREVIEW_START_TIMEOUT_MS = SANDBOX_TIMEOUT_MS - 60_000;
const PREVIEW_HEALTH_CHECK_TIMEOUT_MS = 60_000;
const MAX_PERSISTED_LOG_LENGTH = 20_000;
const PREVIEW_LOG_FILE = ".destoc-preview.log";
const PREVIEW_PORTS = [3000, 5173, 4173, 4321, 8080] as const;
const PREVIEW_RUNTIME_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "use.typekit.net",
  "*.typekit.net",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "esm.sh",
  "cdnjs.cloudflare.com",
  "assets.vercel.com",
  "images.unsplash.com",
  "plus.unsplash.com",
  "images.pexels.com",
  "cdn.sanity.io",
  "res.cloudinary.com",
  "*.cloudinary.com",
  "ik.imagekit.io",
  "*.supabase.co",
  "api.iconify.design",
  "cal.com",
  "*.cal.com",
  "umami.cooldash.xyz",
];

type PackageScripts = {
  build?: string;
  dev?: string;
  start?: string;
};

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

async function isNextProject(sandbox: Sandbox): Promise<boolean> {
  const check = await sandbox.runCommand({
    cmd: "node",
    args: [
      "-e",
      "const manifest = require('./package.json'); process.exit(manifest.dependencies?.next || manifest.devDependencies?.next ? 0 : 1)",
    ],
    cwd: sandbox.cwd,
    timeoutMs: 5_000,
  });
  return check.exitCode === 0;
}

async function packageScripts(sandbox: Sandbox): Promise<PackageScripts> {
  const check = await sandbox.runCommand({
    cmd: "node",
    args: [
      "-e",
      "const manifest = require('./package.json'); process.stdout.write(JSON.stringify(manifest.scripts || {}));",
    ],
    cwd: sandbox.cwd,
    timeoutMs: 5_000,
  });

  if (check.exitCode !== 0) return {};

  try {
    const scripts = JSON.parse(await check.output("stdout")) as Record<string, unknown>;
    return {
      build: typeof scripts.build === "string" ? scripts.build : undefined,
      dev: typeof scripts.dev === "string" ? scripts.dev : undefined,
      start: typeof scripts.start === "string" ? scripts.start : undefined,
    };
  } catch {
    return {};
  }
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

function createExactPatchFallbackScript() {
  return String.raw`
const fs = require("node:fs");
const path = require("node:path");

const patch = fs.readFileSync(process.argv[2], "utf8");
const lines = patch.split(/\n/);
const hunks = [];
let currentFile = null;
let currentHunk = null;

function finishHunk() {
  if (currentHunk) {
    if (currentHunk.oldLines.length === 0) throw new Error("fallback requires at least one removed line");
    hunks.push(currentHunk);
  }
  currentHunk = null;
}

for (const line of lines) {
  if (line.startsWith("+++ b/")) {
    currentFile = line.slice("+++ b/".length).trim();
    continue;
  }
  if (line.startsWith("@@")) {
    finishHunk();
    if (!currentFile) throw new Error("fallback hunk is missing a target file");
    currentHunk = { file: currentFile, oldLines: [], newLines: [], removedLines: [], addedLines: [] };
    continue;
  }
  if (!currentHunk) continue;
  if (line.startsWith("--- ") || line.startsWith("+++ ")) continue;
  if (line.startsWith("-")) {
    currentHunk.oldLines.push(line.slice(1));
    currentHunk.removedLines.push(line.slice(1));
  } else if (line.startsWith("+")) {
    currentHunk.newLines.push(line.slice(1));
    currentHunk.addedLines.push(line.slice(1));
  }
  else if (line.startsWith(" ")) {
    currentHunk.oldLines.push(line.slice(1));
    currentHunk.newLines.push(line.slice(1));
  }
}
finishHunk();

if (hunks.length === 0) throw new Error("fallback found no hunks");

for (const hunk of hunks) {
  if (path.isAbsolute(hunk.file) || hunk.file.includes("..")) throw new Error("unsafe fallback path: " + hunk.file);
  const oldBlock = hunk.oldLines.join("\n");
  const newBlock = hunk.newLines.join("\n");
  const filePath = path.join(process.cwd(), hunk.file);
  const source = fs.readFileSync(filePath, "utf8");
  const index = source.indexOf(oldBlock);
  if (index !== -1) {
    fs.writeFileSync(filePath, source.slice(0, index) + newBlock + source.slice(index + oldBlock.length));
    continue;
  }

  if (newBlock.length > 0 && source.includes(newBlock)) continue;

  let nextSource = source;
  let changed = false;
  if (hunk.removedLines.length === hunk.addedLines.length && hunk.removedLines.length > 0) {
    for (let index = 0; index < hunk.removedLines.length; index += 1) {
      const removedLine = hunk.removedLines[index];
      const addedLine = hunk.addedLines[index];
      if (nextSource.includes(addedLine)) continue;
      if (!nextSource.includes(removedLine)) continue;
      nextSource = nextSource.replace(removedLine, addedLine);
      changed = true;
    }
  } else if (hunk.addedLines.length === 0) {
    for (const removedLine of hunk.removedLines) {
      const withTrailingNewline = removedLine + "\n";
      if (nextSource.includes(withTrailingNewline)) {
        nextSource = nextSource.replace(withTrailingNewline, "");
        changed = true;
      } else if (nextSource.includes(removedLine)) {
        nextSource = nextSource.replace(removedLine, "");
        changed = true;
      }
    }
  }

  if (!changed) throw new Error("fallback could not find exact or overlapping removed block in " + hunk.file);
  fs.writeFileSync(filePath, nextSource);
}

process.stdout.write("Fallback patch applied to " + new Set(hunks.map((hunk) => hunk.file)).size + " file(s).\n");
`;
}

async function applyPatchToSandbox(sandbox: Sandbox, patch: string): Promise<string> {
  const patchPath = `${sandbox.cwd}/.destoc.patch`;
  await sandbox.fs.writeFile(patchPath, normalizeUnifiedDiff(patch), "utf8");

  const apply = await sandbox.runCommand({
    cmd: "git",
    args: ["apply", "--check", "--recount", "--unidiff-zero", patchPath],
    cwd: sandbox.cwd,
    timeoutMs: 15_000,
  });
  const checkLog = await commandLog(apply);

  if (apply.exitCode === 0) {
    const commit = await sandbox.runCommand({
      cmd: "git",
      args: ["apply", "--recount", "--unidiff-zero", patchPath],
      cwd: sandbox.cwd,
      timeoutMs: 15_000,
    });
    const applyLog = await commandLog(commit);
    if (commit.exitCode === 0) {
      return truncateLog([checkLog, applyLog].filter(Boolean).join("\n") || "Patch applied cleanly.");
    }
  }

  const alreadyApplied = await sandbox.runCommand({
    cmd: "git",
    args: ["apply", "--reverse", "--check", "--recount", "--unidiff-zero", patchPath],
    cwd: sandbox.cwd,
    timeoutMs: 15_000,
  });
  const alreadyAppliedLog = await commandLog(alreadyApplied);
  if (alreadyApplied.exitCode === 0) {
    return truncateLog(`Patch was already present in this sandbox.\n${alreadyAppliedLog}`);
  }

  const fallbackPath = `${sandbox.cwd}/.destoc-apply-fallback.cjs`;
  await sandbox.fs.writeFile(fallbackPath, createExactPatchFallbackScript(), "utf8");
  const fallback = await sandbox.runCommand({
    cmd: "node",
    args: [fallbackPath, patchPath],
    cwd: sandbox.cwd,
    timeoutMs: 15_000,
  });
  const fallbackLog = await commandLog(fallback);
  if (fallback.exitCode !== 0) {
    throw new AppError("VALIDATION_ERROR", "Accepted patch could not be applied cleanly.", {
      cause: truncateLog(`git apply:\n${checkLog}\nExact fallback:\n${fallbackLog}`),
    });
  }

  return truncateLog(`git apply needed fallback:\n${checkLog}\n${fallbackLog}`);
}

async function acceptedRevisionPatches(projectId: string, revisionId?: string): Promise<string[]> {
  const revisions = await getPrisma().revision.findMany({
    where: {
      projectId,
      status: "READY",
      id: revisionId ? { not: revisionId } : undefined,
    },
    orderBy: { createdAt: "asc" },
    select: { patch: true },
  });

  return revisions.map((revision) => revision.patch).filter((patch) => patch.trim().length > 0);
}

function previewStartCommand(nextProject: boolean, scripts: PackageScripts): string {
  if (nextProject && !scripts.dev) {
    return `exec npm run start -- -H 0.0.0.0 -p 3000 > ${PREVIEW_LOG_FILE} 2>&1`;
  }

  if (nextProject) {
    return `exec npm run dev -- --hostname 0.0.0.0 --port 3000 > ${PREVIEW_LOG_FILE} 2>&1`;
  }

  const scriptName = scripts.dev ? "dev" : "start";
  return `HOST=0.0.0.0 PORT=3000 exec npm run ${scriptName} -- --host 0.0.0.0 --port 3000 > ${PREVIEW_LOG_FILE} 2>&1`;
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
  input: { sandboxRunId: string; projectId: string; commitSha?: string; patch?: string; revisionId?: string },
) {
  const project = await requireProjectOwnership(input.projectId, userId);
  let logs = "";
  let sandbox: Sandbox | undefined;

  try {
    const credentials = getSandboxCredentials();
    await transitionSandboxRun(userId, input.sandboxRunId, "PROVISIONING");
    if (input.revisionId) {
      await transitionRevision(userId, input.revisionId, "APPLYING");
    }

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
      env: { NODE_ENV: "production" },
      resources: { vcpus: 1 },
      timeout: SANDBOX_TIMEOUT_MS,
      persistent: false,
      networkPolicy: {
        allow: ["github.com", "*.github.com", "registry.npmjs.org", "*.npmjs.org", ...PREVIEW_RUNTIME_HOSTS],
      },
    });

    logs = `Provisioned sandbox ${sandbox.name}. Inspecting project manifest.`;
    await transitionSandboxRun(userId, input.sandboxRunId, "BUILDING", { logs });

    const scripts = await packageScripts(sandbox);
    const nextProject = await isNextProject(sandbox);
    if (!scripts.dev) {
      throw new AppError(
        "VALIDATION_ERROR",
        "This repository does not define an npm dev script. Destoc needs a dev server so accepted code changes can update the live preview.",
      );
    }

    const cumulativePatches = await acceptedRevisionPatches(project.id, input.revisionId);
    if (cumulativePatches.length) {
      logs = appendLog(logs || `Provisioned sandbox ${sandbox.name}.`, `Replaying ${cumulativePatches.length} accepted change${cumulativePatches.length === 1 ? "" : "s"}.`);
      await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });

      for (const [index, patch] of cumulativePatches.entries()) {
        const patchLog = await applyPatchToSandbox(sandbox, patch);
        logs = appendLog(logs, `Accepted change ${index + 1}/${cumulativePatches.length}:\n${patchLog}`);
        await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
      }
    }

    if (input.patch) {
      logs = appendLog(logs || `Provisioned sandbox ${sandbox.name}.`, "Applying requested patch.");
      await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
      const patchLog = await applyPatchToSandbox(sandbox, input.patch);
      logs = appendLog(logs, `Patch apply result:\n${patchLog}`);
      await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
    }

    logs = appendLog(logs, "Installing project dependencies.");
    await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
    const install = await sandbox.runCommand({
      cmd: "sh",
      args: [
        "-lc",
        // Dependency lifecycle scripts are required by a number of legitimate
        // web projects. They run only inside the disposable microVM, before
        // app execution, with no host credentials and tightly scoped egress.
        "if [ -f package-lock.json ]; then npm ci; else npm install; fi",
      ],
      // Production previews still need devDependencies to build source apps
      // (PostCSS, TypeScript, bundler plugins, etc.). The serving process is
      // switched to NODE_ENV=production after this setup step.
      env: { NODE_ENV: "development" },
      timeoutMs: INSTALL_TIMEOUT_MS,
    });
    const installLog = await commandLog(install);
    logs = appendLog(logs, installLog);

    if (install.exitCode !== 0) {
      throw new AppError("VALIDATION_ERROR", "This repository could not install inside the preview sandbox. It may need private packages, unsupported native dependencies, or missing lockfile metadata.", {
        cause: installLog,
      });
    }

    if (nextProject && !scripts.dev) {
      logs = appendLog(logs, "Building production preview.");
      await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
      const build = await sandbox.runCommand({
        cmd: "npm",
        args: ["run", "build"],
        cwd: sandbox.cwd,
        timeoutMs: BUILD_TIMEOUT_MS,
      });
      const buildLog = await commandLog(build);
      logs = appendLog(logs, `Production build:\n${buildLog}`);
      if (build.exitCode !== 0) {
        throw new AppError("VALIDATION_ERROR", "This repository could not build inside the preview sandbox. Check the build log for missing environment variables or unsupported build steps.", {
          cause: buildLog,
        });
      }
    }

    // The untrusted application never receives application credentials. At
    // preview runtime we allow public egress so real websites can load remote
    // image/CDN/font assets instead of rendering half-empty inside the iframe.
    await sandbox.updateNetworkPolicy("allow-all");

    logs = appendLog(logs, "Starting preview server.");
    await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
    await sandbox.runCommand({
      cmd: "sh",
      args: [
        "-lc",
        previewStartCommand(nextProject, scripts),
      ],
      cwd: sandbox.cwd,
      detached: true,
      timeoutMs: PREVIEW_START_TIMEOUT_MS,
    });

    const upstreamPort = await waitForLocalPreview(sandbox, PREVIEW_PORTS);
    if (!upstreamPort) {
      logs = appendLog(logs, `Preview startup log:\n${await readPreviewLog(sandbox)}`);
      throw new AppError(
        "INTERNAL_ERROR",
        "Preview did not start. Confirm the repository has a runnable npm dev script; its sandbox startup log was saved.",
        { expose: true },
      );
    }

    logs = appendLog(logs, `Starting preview bridge for upstream port ${upstreamPort}.`);
    await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
    const previewUrl = await startPreviewBridge(sandbox, upstreamPort);

    const readyRun = await transitionSandboxRun(userId, input.sandboxRunId, "READY", {
      previewUrl,
      logs: appendLog(logs, `Preview bridge ready at ${previewUrl} (upstream port ${upstreamPort})`),
    });
    if (input.revisionId) {
      await transitionRevision(userId, input.revisionId, "READY");
    }

    return readyRun;
  } catch (error) {
    const appError = asAppError(error);
    const errorCode = appError.code === "INTERNAL_ERROR" ? "SANDBOX_EXECUTION_FAILED" : appError.code;
    const errorMessage = appError.expose ? appError.message : "Sandbox execution failed.";
    if (appError.cause) {
      logs = appendLog(logs, `Failure details:\n${String(appError.cause)}`);
    }

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

    if (input.revisionId) {
      try {
        await transitionRevision(userId, input.revisionId, "FAILED", {
          errorCode,
          errorMessage,
        });
      } catch (transitionError) {
        console.error("Failed to persist revision failure", transitionError);
      }
    }

    if (sandbox) {
      await sandbox.stop().catch((stopError: unknown) => {
        console.error("Failed to stop sandbox after execution failure", stopError);
      });
    }

    throw error;
  }
}

export async function applyPatchToExistingSandboxRun(
  userId: string,
  input: { projectId: string; sandboxRunId: string; revisionId: string; patch: string },
) {
  await requireProjectOwnership(input.projectId, userId);
  const run = await getPrisma().sandboxRun.findFirst({
    where: {
      id: input.sandboxRunId,
      projectId: input.projectId,
      project: { workspace: { userId } },
    },
  });
  if (!run) throw new AppError("NOT_FOUND", "Sandbox run not found.");
  if (run.status !== "READY" || !run.previewUrl) {
    throw new AppError("CONFLICT", "Start a live sandbox preview before accepting this patch.");
  }

  const credentials = getSandboxCredentials();
  await transitionRevision(userId, input.revisionId, "APPLYING");
  let logs = appendLog(run.logs ?? "", "Applying accepted patch to the running sandbox.");

  try {
    const sandbox = await Sandbox.get({
      ...credentials,
      name: `destoc-${input.sandboxRunId}`,
      resume: false,
    });
    const patchLog = await applyPatchToSandbox(sandbox, input.patch);
    logs = appendLog(logs, `Patch apply result:\n${patchLog}`);
    await updateSandboxRunProgress(userId, input.sandboxRunId, { logs });
    await transitionRevision(userId, input.revisionId, "READY");
    return getPrisma().sandboxRun.findUniqueOrThrow({ where: { id: input.sandboxRunId } });
  } catch (error) {
    const appError = asAppError(error);
    logs = appendLog(logs, `Failure details:\n${String(appError.cause ?? appError.message)}`);
    await updateSandboxRunProgress(userId, input.sandboxRunId, {
      logs,
      errorCode: appError.code,
      errorMessage: appError.expose ? appError.message : "Patch application failed.",
    }).catch((updateError: unknown) => {
      console.error("Failed to persist patch-application failure", updateError);
    });
    await transitionRevision(userId, input.revisionId, "FAILED", {
      errorCode: appError.code,
      errorMessage: appError.expose ? appError.message : "Patch application failed.",
    }).catch((transitionError: unknown) => {
      console.error("Failed to persist revision failure", transitionError);
    });
    throw error;
  }
}
