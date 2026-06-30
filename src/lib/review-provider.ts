import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { z } from "zod";
import { DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT } from "@/lib/design-review-system-prompt";
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import type { DesignReviewEvidence } from "@/lib/types";

const suggestionSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  title: z.string().min(1).max(200),
  issue: z.string().min(1).max(4_000),
  rationale: z.string().min(1).max(4_000),
  intendedOutcome: z.string().min(1).max(2_000),
  patch: z.string().max(20_000).optional(),
  verificationChecklist: z.array(z.string().min(1).max(500)).min(1).max(10),
});

export const designReviewResultSchema = z.object({
  summary: z.string().min(1).max(4_000),
  suggestions: z.array(suggestionSchema).max(3),
});

export type DesignReviewResult = z.infer<typeof designReviewResultSchema>;

export type DesignReviewRequest = {
  scope: "COMPONENT" | "PAGE";
  prompt?: string;
  evidence: DesignReviewEvidence;
};

export interface DesignReviewProvider {
  readonly id: "mock" | "deepseek" | "local" | "command";
  review(request: DesignReviewRequest): Promise<DesignReviewResult>;
}

function componentPatch(sourceFilePath: string | undefined): string | undefined {
  if (!sourceFilePath?.startsWith("src/")) return undefined;

  return [
    `--- a/${sourceFilePath}`,
    `+++ b/${sourceFilePath}`,
    "@@",
    "-className=\"...\"",
    "+className=\"rounded-md border border-border bg-background px-4 py-3 shadow-sm\"",
  ].join("\n");
}

const reviewJsonShape = "{\"summary\":\"string\",\"suggestions\":[{\"severity\":\"low|medium|high\",\"confidence\":0.8,\"title\":\"string\",\"issue\":\"string\",\"rationale\":\"string\",\"intendedOutcome\":\"string\",\"patch\":\"optional unified diff\",\"verificationChecklist\":[\"string\"]}]}";

const implementationGuidance = [
  "If the user asks to implement, rewrite, optimize, or change a selected component, do not stop at advice.",
  "Return a concrete implementation suggestion with code.",
  "Prefer editing one of evidence.sourceContext.candidates when candidates are available.",
  "When a source candidate contains the relevant UI, include a unified diff in suggestion.patch using --- a/path and +++ b/path headers.",
  "Only propose patches under src/app, src/components, or CSS files.",
  "If the exact text is not present, still inspect nearby candidate files and patch the most likely UI source when the requested change is low-risk.",
  "Only omit suggestion.patch when there is genuinely no safe source candidate.",
].join(" ");

export function withCodexExecSafetyArgs(command: string, args: string[]) {
  const isCodexExec = basename(command) === "codex" && args[0] === "exec";
  if (!isCodexExec || args.includes("--skip-git-repo-check")) return [...args];
  return [args[0], "--skip-git-repo-check", ...args.slice(1)];
}

function providerRequestPayload(request: DesignReviewRequest) {
  return {
    scope: request.scope,
    prompt: request.prompt,
    evidence: request.evidence,
  };
}

/**
 * A deterministic provider used until a live DeepSeek integration is configured.
 * It intentionally only speaks about supplied evidence so the UI cannot present
 * generic feedback as an analysis of the user’s application.
 */
export const mockDesignReviewProvider: DesignReviewProvider = {
  id: "mock",
  async review(request) {
    const { evidence } = request;
    const elementLabel = evidence.selectedElement?.role ?? evidence.selectedElement?.selector;

    const result: DesignReviewResult = {
      summary: elementLabel
        ? `I inspected the selected ${elementLabel} and prepared a hierarchy-focused improvement from the supplied interface evidence.`
        : "I inspected the page evidence and prepared a hierarchy-focused interface improvement.",
      suggestions: [
        {
          severity: "medium",
          confidence: 0.86,
          title: elementLabel ? "Strengthen the selected component hierarchy" : "Establish a clearer page hierarchy",
          issue: elementLabel
            ? `The selected ${elementLabel} has no recorded visual hierarchy guidance in the supplied element context.`
            : "The page review has no component-specific target, so the improvement should begin with the highest-priority content grouping.",
          rationale: "Clear grouping, predictable spacing, and restrained elevation make interactive surfaces easier to scan and compare.",
          intendedOutcome: "Create a distinct, consistently spaced surface while preserving the existing content and behavior.",
          patch: request.scope === "COMPONENT" ? componentPatch(evidence.sourceFilePath) : undefined,
          verificationChecklist: [
            "Check the target at the captured desktop viewport.",
            "Confirm text contrast and focus visibility remain intact.",
            "Verify the change does not alter interaction behavior.",
          ],
        },
      ],
    };

    return designReviewResultSchema.parse(result);
  },
};

class DeepSeekProviderPlaceholder implements DesignReviewProvider {
  readonly id = "deepseek" as const;

  async review(): Promise<DesignReviewResult> {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "DeepSeek review is not configured yet. Select the mock provider until the live integration is added.",
    );
  }
}

class LocalOpenAICompatibleProvider implements DesignReviewProvider {
  readonly id = "local" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey?: string,
  ) {}

  private parseProviderContent(content: string): DesignReviewResult {
    const trimmed = content.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch?.[1] ?? trimmed;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;

    return designReviewResultSchema.parse(JSON.parse(jsonText));
  }

  async review(request: DesignReviewRequest): Promise<DesignReviewResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT,
              "Return only JSON matching this shape:",
              reviewJsonShape,
              implementationGuidance,
              "Do not include markdown fences.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify(providerRequestPayload(request)),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new AppError("CONFIGURATION_ERROR", `Local review provider failed with HTTP ${response.status}.`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError("CONFIGURATION_ERROR", "Local review provider returned an empty response.");
    }

    try {
      return this.parseProviderContent(content);
    } catch (error) {
      throw new AppError("CONFIGURATION_ERROR", "Local review provider returned invalid review JSON.", {
        cause: error,
      });
    }
  }
}

class CommandReviewProvider implements DesignReviewProvider {
  readonly id = "command" as const;

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly timeoutMs: number,
  ) {}

  private buildPrompt(request: DesignReviewRequest) {
    return [
      DESTOC_DESIGN_REVIEW_SYSTEM_PROMPT,
      "Return only valid JSON. Do not include markdown fences or commentary.",
      "The JSON must match this shape:",
      reviewJsonShape,
      implementationGuidance,
      "",
      "Request:",
      JSON.stringify(providerRequestPayload(request)),
    ].join("\n");
  }

  private parseCommandOutput(output: string): DesignReviewResult {
    const trimmed = output.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch?.[1] ?? trimmed;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;

    return designReviewResultSchema.parse(JSON.parse(jsonText));
  }

  private commandInvocation() {
    const args = withCodexExecSafetyArgs(this.command, this.args);
    const isCodexExec = basename(this.command) === "codex" && args[0] === "exec";
    const alreadyCapturesLastMessage = args.includes("--output-last-message") || args.includes("-o");

    if (!isCodexExec || alreadyCapturesLastMessage) {
      return { args, outputPath: undefined };
    }

    const outputPath = join(tmpdir(), `destoc-command-review-${randomUUID()}.txt`);
    const insertionIndex = args.at(-1) === "-" ? args.length - 1 : args.length;
    args.splice(insertionIndex, 0, "--output-last-message", outputPath);
    return { args, outputPath };
  }

  private commandErrorMessage(error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    return raw.replace(/\u001b\[[0-9;]*m/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
  }

  private async runCommand(input: string): Promise<string> {
    const invocation = this.commandInvocation();

    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        const child = spawn(this.command, invocation.args, {
        env: {
          ...process.env,
          NO_COLOR: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`Command review provider timed out after ${this.timeoutMs}ms.`));
      }, this.timeoutMs);
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      const maxBuffer = 1024 * 1024;

      child.stdout.on("data", (chunk: Buffer) => {
        stdoutBytes += chunk.byteLength;
        if (stdoutBytes > maxBuffer) {
          child.kill("SIGTERM");
          reject(new Error("Command review provider stdout exceeded 1MB."));
          return;
        }
        stdoutChunks.push(chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderrBytes += chunk.byteLength;
        if (stderrBytes <= maxBuffer) stderrChunks.push(chunk);
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
          reject(new Error(stderr || `Command review provider exited with code ${code}.`));
          return;
        }
        resolve(Buffer.concat(stdoutChunks).toString("utf8"));
      });
      child.stdin.end(input);
      });

      if (invocation.outputPath) {
        const finalMessage = await readFile(invocation.outputPath, "utf8").catch(() => "");
        if (finalMessage.trim()) return finalMessage;
      }

      return stdout;
    } finally {
      if (invocation.outputPath) {
        await rm(invocation.outputPath, { force: true }).catch(() => undefined);
      }
    }
  }

  async review(request: DesignReviewRequest): Promise<DesignReviewResult> {
    let stdout = "";
    try {
      stdout = await this.runCommand(this.buildPrompt(request));
    } catch (error) {
      const details = this.commandErrorMessage(error);
      throw new AppError(
        "CONFIGURATION_ERROR",
        details ? `Command review provider failed: ${details}` : "Command review provider failed.",
        { cause: error },
      );
    }

    try {
      return this.parseCommandOutput(stdout);
    } catch (error) {
      throw new AppError("CONFIGURATION_ERROR", "Command review provider returned invalid review JSON.", {
        cause: error,
      });
    }
  }
}

export function getDesignReviewProvider(): DesignReviewProvider {
  const env = getServerEnv();

  if (env.DESIGN_REVIEW_PROVIDER === "deepseek") {
    if (!env.DEEPSEEK_API_KEY) {
      throw new AppError("CONFIGURATION_ERROR", "DEEPSEEK_API_KEY is required for the DeepSeek provider.");
    }
    return new DeepSeekProviderPlaceholder();
  }

  if (env.DESIGN_REVIEW_PROVIDER === "local") {
    if (!env.LOCAL_AI_BASE_URL) {
      throw new AppError("CONFIGURATION_ERROR", "LOCAL_AI_BASE_URL is required for the local review provider.");
    }
    return new LocalOpenAICompatibleProvider(env.LOCAL_AI_BASE_URL, env.LOCAL_AI_MODEL, env.LOCAL_AI_API_KEY);
  }

  if (env.DESIGN_REVIEW_PROVIDER === "command") {
    if (env.NODE_ENV === "production" && !env.ALLOW_COMMAND_REVIEW_PROVIDER) {
      throw new AppError("CONFIGURATION_ERROR", "Command review provider is disabled in production.");
    }
    if (!env.COMMAND_AI_BIN) {
      throw new AppError("CONFIGURATION_ERROR", "COMMAND_AI_BIN is required for the command review provider.");
    }
    return new CommandReviewProvider(env.COMMAND_AI_BIN, env.COMMAND_AI_ARGS, env.COMMAND_AI_TIMEOUT_MS);
  }

  return mockDesignReviewProvider;
}
