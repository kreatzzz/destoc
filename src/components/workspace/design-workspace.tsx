"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceHeader } from "@/components/app-shell/workspace-header";
import { CanvasPreview } from "./canvas-preview";
import { CodeChangesPane } from "./code-changes-pane";
import { WorkspaceChat } from "./workspace-chat";
import type { WorkspaceChatMessage, WorkspaceData, WorkspacePreview, WorkspaceSelectedElement, WorkspaceSuggestion } from "./types";

type SandboxRunPayload = {
  id: string;
  status: NonNullable<WorkspacePreview["status"]>;
  previewUrl?: string | null;
  logs?: string | null;
  errorMessage?: string | null;
};

type ReviewSuggestionPayload = {
  id: string;
  title: string;
  issue: string;
  rationale: string;
  severity: string;
  status?: string;
  patch?: string | null;
  verificationChecklist?: unknown;
};

type RevisionPayload = {
  id: string;
  projectId: string;
  sandboxRunId?: string | null;
  patch: string;
  sandboxRun?: SandboxRunPayload | null;
};

const defaultData: WorkspaceData = {
  project: { id: "objects", name: "Objects collection", repository: "miloh/objects", branch: "main", updatedAt: "Just now", revisionCount: 4 },
  revisions: [],
  suggestions: [],
};

const defaultChatWidth = 360;
const defaultCodePaneWidth = 420;

interface DesignWorkspaceProps {
  data?: WorkspaceData;
}

const activeSandboxStatuses = new Set<WorkspacePreview["status"]>(["QUEUED", "PROVISIONING", "BUILDING"]);
const retryablePreviewErrors = new Set(["Accepted patch could not be applied cleanly."]);

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

function selectedElementLabel(element: WorkspaceSelectedElement) {
  if (element.role) return element.role;
  const text = element.text?.trim();
  if (text) return text.slice(0, 48);
  return element.selector.split(">").at(-1)?.trim() ?? element.selector;
}

function selectedElementIdentity(element: WorkspaceSelectedElement) {
  return [
    element.selector,
    element.role ?? "",
    element.text?.trim() ?? "",
    element.domPath.join(">"),
  ].join("|");
}

function selectedElementNotesForPrompt(elements: WorkspaceSelectedElement[]) {
  return elements
    .map((element, index) => {
      const note = element.note?.trim();
      if (!note) return null;
      return `#${index + 1} ${selectedElementLabel(element)}: ${note}`;
    })
    .filter((note): note is string => Boolean(note));
}

function buildReviewPrompt(prompt: string, selectedElementNotes: string[]) {
  return [
    prompt.trim(),
    selectedElementNotes.length ? `Selected component notes:\n${selectedElementNotes.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

function mapReviewSuggestion(suggestion: ReviewSuggestionPayload): WorkspaceSuggestion {
  return {
    id: suggestion.id,
    title: suggestion.title,
    summary: suggestion.issue,
    rationale: suggestion.rationale,
    impact: suggestion.severity === "high" ? "High impact" : suggestion.severity === "medium" ? "Medium impact" : "Low impact",
    status: suggestion.status === "ACCEPTED" ? "accepted" : suggestion.status === "REJECTED" ? "rejected" : suggestion.status === "FAILED" ? "failed" : "pending",
    patch: suggestion.patch,
    verificationChecklist: Array.isArray(suggestion.verificationChecklist)
      ? suggestion.verificationChecklist.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function DesignWorkspace({ data = defaultData }: DesignWorkspaceProps) {
  const router = useRouter();
  const [designMode, setDesignMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(data.preview?.url);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [sandboxRunId, setSandboxRunId] = useState(data.preview?.runId);
  const [previewStatus, setPreviewStatus] = useState<WorkspacePreview["status"]>(data.preview?.status);
  const [previewLogs, setPreviewLogs] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(data.preview?.errorMessage ?? null);
  const [isPreviewStarting, setIsPreviewStarting] = useState(activeSandboxStatuses.has(data.preview?.status));
  const [selectedElements, setSelectedElements] = useState<WorkspaceSelectedElement[]>([]);
  const [suggestions, setSuggestions] = useState<WorkspaceSuggestion[]>(data.suggestions);
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);
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
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);
  const [codePaneOpen, setCodePaneOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(defaultChatWidth);
  const [codePaneWidth, setCodePaneWidth] = useState(defaultCodePaneWidth);
  const [isStoppingPreview, setIsStoppingPreview] = useState(false);
  const activeRunRef = useRef<string | undefined>(data.preview?.runId);
  const startingRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const streamingIntervalsRef = useRef<Array<ReturnType<typeof setInterval>>>([]);

  const previewStatusText = useMemo(
    () => progressText(previewStatus, previewLogs, previewUrl, previewError),
    [previewError, previewLogs, previewStatus, previewUrl],
  );
  const hasCodeChanges = suggestions.some((suggestion) => suggestion.patch?.trim());
  const canStopPreview = Boolean(sandboxRunId && previewStatus && !["STOPPED", "FAILED"].includes(previewStatus));

  const applyRunState = useCallback((run: SandboxRunPayload) => {
    setSandboxRunId(run.id);
    setPreviewStatus(run.status);
    setPreviewLogs(run.logs ?? "");
    setPreviewError(run.errorMessage ?? null);
    if (run.previewUrl && run.status === "READY") setPreviewUrl(run.previewUrl);
  }, []);

  const streamAssistantMessage = useCallback((content: string) => {
    const id = crypto.randomUUID();
    let index = 0;
    setMessages((current) => [...current, { id, role: "assistant", content: "" }]);

    const interval = setInterval(() => {
      index = Math.min(content.length, index + 3);
      setMessages((current) => current.map((message) => (
        message.id === id ? { ...message, content: content.slice(0, index) } : message
      )));

      if (index >= content.length) {
        clearInterval(interval);
        streamingIntervalsRef.current = streamingIntervalsRef.current.filter((candidate) => candidate !== interval);
      }
    }, 18);

    streamingIntervalsRef.current.push(interval);
  }, []);

  const pollSandboxRun = useCallback(async (runId: string) => {
    activeRunRef.current = runId;
    setIsPreviewStarting(true);

    for (let attempt = 0; attempt < 180; attempt += 1) {
      if (activeRunRef.current !== runId) return false;

      const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs/${runId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { sandboxRun?: SandboxRunPayload; error?: { message?: string } } | null;

      if (!response.ok || !payload?.sandboxRun) {
        setPreviewError(payload?.error?.message ?? "Could not read sandbox progress.");
        setIsPreviewStarting(false);
        return false;
      }

      applyRunState(payload.sandboxRun);

      if (payload.sandboxRun.status === "READY" && payload.sandboxRun.previewUrl) {
        setPreviewUrl(payload.sandboxRun.previewUrl);
        setIsPreviewStarting(false);
        router.refresh();
        return true;
      }

      if (payload.sandboxRun.status === "FAILED" || payload.sandboxRun.status === "STOPPED") {
        setPreviewUrl(undefined);
        setPreviewError(payload.sandboxRun.errorMessage ?? "Sandbox preview could not start.");
        setIsPreviewStarting(false);
        router.refresh();
        return false;
      }

      await wait(1_500);
    }

    setPreviewError("Sandbox startup is still running. Refresh the project to continue watching progress.");
    setIsPreviewStarting(false);
    return false;
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

  const stopPreview = useCallback(async () => {
    if (!sandboxRunId || isStoppingPreview) return;

    setIsStoppingPreview(true);
    try {
      const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs/${sandboxRunId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null) as { sandboxRun?: SandboxRunPayload; error?: { message?: string } } | null;
      if (!response.ok || !payload?.sandboxRun) {
        throw new Error(payload?.error?.message ?? "Sandbox could not be stopped.");
      }
      activeRunRef.current = undefined;
      setPreviewUrl(undefined);
      setIsPreviewStarting(false);
      applyRunState(payload.sandboxRun);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Sandbox could not be stopped.");
    } finally {
      setIsStoppingPreview(false);
    }
  }, [applyRunState, data.project.id, isStoppingPreview, sandboxRunId]);

  const restartPreview = useCallback(async () => {
    if (isPreviewStarting) return;
    if (sandboxRunId && previewStatus && !["STOPPED", "FAILED"].includes(previewStatus)) {
      await stopPreview();
    }
    await startPreview();
  }, [isPreviewStarting, previewStatus, sandboxRunId, startPreview, stopPreview]);

  useEffect(() => {
    if (sandboxRunId) activeRunRef.current = sandboxRunId;
  }, [sandboxRunId]);

  useEffect(() => () => {
    for (const interval of streamingIntervalsRef.current) clearInterval(interval);
    streamingIntervalsRef.current = [];
  }, []);

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

    if (!previewUrl && (previewStatus !== "FAILED" || retryablePreviewErrors.has(previewError ?? ""))) {
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
  }, [applyRunState, data.project.id, pollSandboxRun, previewError, previewStatus, previewUrl, sandboxRunId, startPreview]);

  function addSelectedElement(selection: WorkspaceSelectedElement) {
    setSelectedElements((current) => {
      const nextSelection = { ...selection, id: selection.id || crypto.randomUUID() };
      const existing = current.find((element) => selectedElementIdentity(element) === selectedElementIdentity(nextSelection));
      if (existing) {
        setActiveSelectionId(existing.id);
        return current;
      }
      setActiveSelectionId(nextSelection.id);
      return [...current, nextSelection];
    });
  }

  function removeSelectedElement(selectionId: string) {
    setSelectedElements((current) => {
      const nextElements = current.filter((element) => element.id !== selectionId);
      if (activeSelectionId === selectionId) {
        setActiveSelectionId(nextElements.at(-1)?.id ?? null);
      }
      return nextElements;
    });
  }

  function updateSelectedElementNote(selectionId: string, note: string) {
    setSelectedElements((current) => current.map((element) => (
      element.id === selectionId ? { ...element, note } : element
    )));
  }

  async function sendPrompt() {
    const trimmedPrompt = prompt.trim();
    const selectedElementsSnapshot = selectedElements;
    const activeSelectionIdSnapshot = activeSelectionId;
    const selectedElementNotes = selectedElementNotesForPrompt(selectedElementsSnapshot);
    const reviewPrompt = buildReviewPrompt(trimmedPrompt, selectedElementNotes);
    if (!reviewPrompt || isAuditPending) return;

    setPrompt("");
    setAuditError(null);
    setIsAuditPending(true);
    setSelectedElements([]);
    setActiveSelectionId(null);
    const messageId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        id: messageId,
        role: "user",
        content: trimmedPrompt || `Using selected component notes:\n${selectedElementNotes.join("\n")}`,
      },
    ]);

    try {
      if (!previewUrl) throw new Error("Preview is still starting. Try again when it is live.");
      const focusedElement = selectedElementsSnapshot.find((element) => element.id === activeSelectionIdSnapshot)
        ?? selectedElementsSnapshot.at(-1)
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
            selectedElements: selectedElementsSnapshot.map((element) => ({
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
          prompt: reviewPrompt,
        }),
      });
      const reviewPayload = await reviewResponse.json().catch(() => null) as {
        review?: { result?: { summary?: string }; suggestions?: ReviewSuggestionPayload[] };
        error?: { message?: string };
      } | null;
      if (!reviewResponse.ok) throw new Error(reviewPayload?.error?.message ?? "Could not run the design review.");

      const nextSuggestions = reviewPayload?.review?.suggestions?.map(mapReviewSuggestion) ?? [];
      setSuggestions((current) => [
        ...current.filter((suggestion) => suggestion.status === "accepted"),
        ...nextSuggestions,
      ]);
      const hasPatch = nextSuggestions.some((suggestion) => suggestion.patch?.trim());
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: hasPatch
          ? "I drafted a code change. Review the card below; the diff is in the code pane."
          : "I could not draft a safe diff yet. Try selecting a more specific component or adding a more direct note.",
      }]);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete the review.";
      setAuditError(message);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: message }]);
    } finally {
      setIsAuditPending(false);
    }
  }

  async function acceptSuggestion(suggestionId: string) {
    setPendingSuggestionId(suggestionId);
    setAuditError(null);
    streamAssistantMessage("Accepted. Applying the patch to the live sandbox…");

    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/accept`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { revision?: RevisionPayload; error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not accept this patch.");

      setSuggestions((current) => current.map((suggestion) => (
        suggestion.id === suggestionId ? { ...suggestion, status: "accepted" } : suggestion
      )));
      if (payload?.revision?.sandboxRun) {
        applyRunState(payload.revision.sandboxRun);
        window.setTimeout(() => setPreviewReloadKey((key) => key + 1), 450);
        streamAssistantMessage("Patch applied. The preview has been refreshed with the completed change.");
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not accept this patch.";
      setAuditError(message);
      streamAssistantMessage(message);
    } finally {
      setPendingSuggestionId(null);
    }
  }

  async function rejectSuggestion(suggestionId: string) {
    setPendingSuggestionId(suggestionId);
    setAuditError(null);

    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not reject this suggestion.");

      setSuggestions((current) => current.map((suggestion) => (
        suggestion.id === suggestionId ? { ...suggestion, status: "rejected" } : suggestion
      )));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reject this suggestion.";
      setAuditError(message);
    } finally {
      setPendingSuggestionId(null);
    }
  }

  return (
    <div className="flex h-dvh min-h-[640px] flex-col overflow-hidden bg-[#111110] font-sans antialiased">
      <WorkspaceHeader
        project={data.project}
        previewStatusText={previewStatusText}
        previewError={previewError}
        isPreviewStarting={isPreviewStarting}
        onRestartSandbox={() => void restartPreview()}
        onStopSandbox={() => void stopPreview()}
        canStopSandbox={canStopPreview}
        isStoppingSandbox={isStoppingPreview}
        onToggleCodePane={() => setCodePaneOpen((open) => !open)}
        codePaneOpen={codePaneOpen}
        hasCodeChanges={hasCodeChanges}
      />
      <div className="flex min-h-0 flex-1">
        <WorkspaceChat
          width={chatWidth}
          onWidthChange={setChatWidth}
          selectedElements={selectedElements}
          activeSelectionId={activeSelectionId}
          messages={messages}
          suggestions={suggestions}
          prompt={prompt}
          isAuditPending={isAuditPending}
          auditError={auditError}
          pendingSuggestionId={pendingSuggestionId}
          onPromptChange={setPrompt}
          onSendPrompt={() => void sendPrompt()}
          onAcceptSuggestion={(suggestionId) => void acceptSuggestion(suggestionId)}
          onRejectSuggestion={(suggestionId) => void rejectSuggestion(suggestionId)}
          onRemoveSelection={removeSelectedElement}
          onActiveSelectionChange={setActiveSelectionId}
          onSelectionNoteChange={updateSelectedElementNote}
        />
        <CanvasPreview
          designMode={designMode}
          previewUrl={previewUrl}
          previewReloadKey={previewReloadKey}
          selectedElements={selectedElements}
          previewStatusText={previewStatusText}
          previewError={previewError}
          isPreviewStarting={isPreviewStarting}
          onDesignModeChange={setDesignMode}
          onSelectionChange={addSelectedElement}
        />
        <div
          className={`h-full shrink-0 overflow-hidden transition-[width,opacity] duration-200 ease-out ${codePaneOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ width: codePaneOpen ? codePaneWidth : 0 }}
          aria-hidden={!codePaneOpen}
        >
          <CodeChangesPane
            width={codePaneWidth}
            onWidthChange={setCodePaneWidth}
            suggestions={suggestions}
            onClose={() => setCodePaneOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
