"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceHeader } from "@/components/app-shell/workspace-header";
import { CanvasPreview } from "./canvas-preview";
import { WorkspaceChat } from "./workspace-chat";
import type { WorkspaceChatMessage, WorkspaceData, WorkspacePreview, WorkspaceSelectedElement } from "./types";

type SandboxRunPayload = {
  id: string;
  status: NonNullable<WorkspacePreview["status"]>;
  previewUrl?: string | null;
  logs?: string | null;
  errorMessage?: string | null;
};

const defaultData: WorkspaceData = {
  project: { id: "objects", name: "Objects collection", repository: "miloh/objects", branch: "main", updatedAt: "Just now", revisionCount: 4 },
  revisions: [],
  suggestions: [],
};

interface DesignWorkspaceProps {
  data?: WorkspaceData;
}

const activeSandboxStatuses = new Set<WorkspacePreview["status"]>(["QUEUED", "PROVISIONING", "BUILDING"]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function progressText(status: WorkspacePreview["status"] | undefined, logs: string, previewUrl: string | undefined, error: string | null) {
  if (error) return "Preview needs attention";
  if (previewUrl && status === "READY") return "Preview live";
  if (logs.includes("Starting preview bridge")) return "Connecting preview bridge…";
  if (logs.includes("Starting preview server")) return "Starting preview server…";
  if (logs.includes("Building production preview")) return "Building production preview…";
  if (logs.includes("Installing project dependencies")) return "Installing dependencies…";
  if (logs.includes("Inspecting project manifest")) return "Inspecting repository…";
  if (status === "QUEUED") return "Queued preview startup…";
  if (status === "PROVISIONING") return "Provisioning isolated sandbox…";
  if (status === "BUILDING") return "Preparing repository preview…";
  if (status === "STOPPED") return "Preview stopped. Restarting…";
  if (status === "FAILED") return "Preview failed";
  return "Preparing preview…";
}

function mapSelectedElementForApi(element: WorkspaceSelectedElement | null) {
  if (!element) return undefined;
  return {
    selector: element.selector,
    role: element.role ?? undefined,
    text: element.text || undefined,
    domPath: element.domPath,
    computedStyles: element.computedStyles,
    boundingBox: {
      x: element.boundingBox.x,
      y: element.boundingBox.y,
      width: element.boundingBox.width,
      height: element.boundingBox.height,
    },
    classNames: element.classes,
  };
}

export function DesignWorkspace({ data = defaultData }: DesignWorkspaceProps) {
  const router = useRouter();
  const [designMode, setDesignMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(data.preview?.url);
  const [sandboxRunId, setSandboxRunId] = useState(data.preview?.runId);
  const [previewStatus, setPreviewStatus] = useState<WorkspacePreview["status"]>(data.preview?.status);
  const [previewLogs, setPreviewLogs] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(data.preview?.errorMessage ?? null);
  const [isPreviewStarting, setIsPreviewStarting] = useState(activeSandboxStatuses.has(data.preview?.status));
  const [selectedElements, setSelectedElements] = useState<WorkspaceSelectedElement[]>([]);
  const [activeSelectionSelector, setActiveSelectionSelector] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<WorkspaceChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Select components in the preview, then ask for a design audit or improvement plan. I’ll keep the selected components as context.",
    },
  ]);
  const [isAuditPending, setIsAuditPending] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const activeRunRef = useRef<string | undefined>(data.preview?.runId);
  const startingRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);

  const previewStatusText = useMemo(
    () => progressText(previewStatus, previewLogs, previewUrl, previewError),
    [previewError, previewLogs, previewStatus, previewUrl],
  );

  const applyRunState = useCallback((run: SandboxRunPayload) => {
    setSandboxRunId(run.id);
    setPreviewStatus(run.status);
    setPreviewLogs(run.logs ?? "");
    setPreviewError(run.errorMessage ?? null);
    if (run.previewUrl && run.status === "READY") setPreviewUrl(run.previewUrl);
  }, []);

  const pollSandboxRun = useCallback(async (runId: string) => {
    activeRunRef.current = runId;
    setIsPreviewStarting(true);

    for (let attempt = 0; attempt < 180; attempt += 1) {
      if (activeRunRef.current !== runId) return;

      const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs/${runId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { sandboxRun?: SandboxRunPayload; error?: { message?: string } } | null;

      if (!response.ok || !payload?.sandboxRun) {
        setPreviewError(payload?.error?.message ?? "Could not read sandbox progress.");
        setIsPreviewStarting(false);
        return;
      }

      applyRunState(payload.sandboxRun);

      if (payload.sandboxRun.status === "READY" && payload.sandboxRun.previewUrl) {
        setPreviewUrl(payload.sandboxRun.previewUrl);
        setIsPreviewStarting(false);
        router.refresh();
        return;
      }

      if (payload.sandboxRun.status === "FAILED" || payload.sandboxRun.status === "STOPPED") {
        setPreviewUrl(undefined);
        setPreviewError(payload.sandboxRun.errorMessage ?? "Sandbox preview could not start.");
        setIsPreviewStarting(false);
        router.refresh();
        return;
      }

      await wait(1_500);
    }

    setPreviewError("Sandbox startup is still running. Refresh the project to continue watching progress.");
    setIsPreviewStarting(false);
  }, [applyRunState, data.project.id, router]);

  const startPreview = useCallback(async () => {
    if (startingRef.current) return;

    startingRef.current = true;
    setIsPreviewStarting(true);
    setPreviewUrl(undefined);
    setPreviewError(null);
    setPreviewLogs("");
    setPreviewStatus("QUEUED");

    try {
      const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const payload = await response.json().catch(() => null) as { sandboxRun?: SandboxRunPayload; error?: { message?: string } } | null;

      if (!response.ok || !payload?.sandboxRun?.id) {
        setPreviewError(payload?.error?.message ?? "Preview could not be queued.");
        setIsPreviewStarting(false);
        return;
      }

      applyRunState(payload.sandboxRun);
      await pollSandboxRun(payload.sandboxRun.id);
    } finally {
      startingRef.current = false;
    }
  }, [applyRunState, data.project.id, pollSandboxRun]);

  useEffect(() => {
    if (sandboxRunId) activeRunRef.current = sandboxRunId;
  }, [sandboxRunId]);

  useEffect(() => {
    if (autoStartAttemptedRef.current) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (sandboxRunId && activeSandboxStatuses.has(previewStatus)) {
      autoStartAttemptedRef.current = true;
      timeout = setTimeout(() => void pollSandboxRun(sandboxRunId), 0);
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }

    if (!previewUrl && previewStatus !== "FAILED") {
      autoStartAttemptedRef.current = true;
      timeout = setTimeout(() => void startPreview(), 0);
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }

    if (sandboxRunId && previewUrl && previewStatus === "READY") {
      autoStartAttemptedRef.current = true;
      void (async () => {
        const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs/${sandboxRunId}?probe=true`, { cache: "no-store" });
        const payload = await response.json().catch(() => null) as { stopped?: boolean; sandboxRun?: SandboxRunPayload } | null;
        if (response.ok && payload?.stopped) {
          setPreviewUrl(undefined);
          applyRunState(payload.sandboxRun!);
          await startPreview();
        }
      })();
    }
  }, [applyRunState, data.project.id, pollSandboxRun, previewStatus, previewUrl, sandboxRunId, startPreview]);

  function addSelectedElement(selection: WorkspaceSelectedElement) {
    setSelectedElements((current) => {
      if (current.some((element) => element.selector === selection.selector)) return current;
      return [...current, selection];
    });
    setActiveSelectionSelector(selection.selector);
  }

  function removeSelectedElement(selector: string) {
    setSelectedElements((current) => {
      const nextElements = current.filter((element) => element.selector !== selector);
      if (activeSelectionSelector === selector) {
        setActiveSelectionSelector(nextElements.at(-1)?.selector ?? null);
      }
      return nextElements;
    });
  }

  function updateSelectedElementNote(selector: string, note: string) {
    setSelectedElements((current) => current.map((element) => (
      element.selector === selector ? { ...element, note } : element
    )));
  }

  async function sendPrompt() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isAuditPending) return;

    setPrompt("");
    setAuditError(null);
    setIsAuditPending(true);
    const messageId = crypto.randomUUID();
    setMessages((current) => [...current, { id: messageId, role: "user", content: trimmedPrompt }]);

    try {
      if (!previewUrl) throw new Error("Preview is still starting. Try again when it is live.");
      const focusedElement = selectedElements.find((element) => element.selector === activeSelectionSelector)
        ?? selectedElements.at(-1)
        ?? null;
      const targetResponse = await fetch("/api/reviews/targets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: data.project.id,
          sandboxRunId,
          pageUrl: previewUrl,
          domContext: {
            source: "workspace-chat",
            selectedElements: selectedElements.map((element) => ({
              selector: element.selector,
              role: element.role,
              text: element.text,
              classes: element.classes,
              note: element.note,
            })),
          },
          element: mapSelectedElementForApi(focusedElement),
        }),
      });
      const targetPayload = await targetResponse.json().catch(() => null) as { reviewTarget?: { id: string }; error?: { message?: string } } | null;
      if (!targetResponse.ok || !targetPayload?.reviewTarget?.id) {
        throw new Error(targetPayload?.error?.message ?? "Could not create a review target.");
      }

      const reviewResponse = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: data.project.id,
          reviewTargetId: targetPayload.reviewTarget.id,
          scope: "PAGE",
          prompt: trimmedPrompt,
        }),
      });
      const reviewPayload = await reviewResponse.json().catch(() => null) as {
        review?: { result?: { summary?: string }; suggestions?: Array<{ title?: string }> };
        error?: { message?: string };
      } | null;
      if (!reviewResponse.ok) throw new Error(reviewPayload?.error?.message ?? "Could not run the design review.");

      const summary = reviewPayload?.review?.result?.summary
        ?? reviewPayload?.review?.suggestions?.[0]?.title
        ?? "I created a new design review from your selected context.";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: summary }]);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete the review.";
      setAuditError(message);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: message }]);
    } finally {
      setIsAuditPending(false);
    }
  }

  async function disconnectProject() {
    setIsDisconnecting(true);
    const response = await fetch(`/api/projects/${data.project.id}`, { method: "DELETE" });
    if (response.ok) router.push("/workspace");
    else {
      setPreviewError("Project could not be deleted.");
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="flex h-dvh min-h-[640px] flex-col overflow-hidden bg-[#111110] font-sans antialiased">
      <WorkspaceHeader
        project={data.project}
        previewStatusText={previewStatusText}
        previewError={previewError}
        isPreviewStarting={isPreviewStarting}
        onDisconnect={() => void disconnectProject()}
        isDisconnecting={isDisconnecting}
      />
      <div className="flex min-h-0 flex-1">
        <WorkspaceChat
          selectedElements={selectedElements}
          activeSelectionSelector={activeSelectionSelector}
          messages={messages}
          prompt={prompt}
          isAuditPending={isAuditPending}
          auditError={auditError}
          onPromptChange={setPrompt}
          onSendPrompt={() => void sendPrompt()}
          onRemoveSelection={removeSelectedElement}
          onActiveSelectionChange={setActiveSelectionSelector}
          onSelectionNoteChange={updateSelectedElementNote}
        />
        <CanvasPreview
          designMode={designMode}
          previewUrl={previewUrl}
          selectedElements={selectedElements}
          previewStatusText={previewStatusText}
          previewError={previewError}
          isPreviewStarting={isPreviewStarting}
          onDesignModeChange={setDesignMode}
          onSelectionChange={addSelectedElement}
        />
      </div>
    </div>
  );
}
