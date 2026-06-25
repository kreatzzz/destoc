"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { WorkspaceHeader } from "@/components/app-shell/workspace-header";
import { CanvasPreview } from "./canvas-preview";
import { ProjectNavigation } from "./project-navigation";
import { ReviewInspector } from "./review-inspector";
import type { ReviewStatus, WorkspaceData, WorkspaceSelectedElement } from "./types";

type WorkspacePanel = "canvas" | "audit" | "settings" | "activity";

const defaultData: WorkspaceData = {
  project: { id: "objects", name: "Objects collection", repository: "miloh/objects", branch: "main", updatedAt: "Just now", revisionCount: 4 },
  revisions: [
    { id: "current", label: "Current canvas", description: "Unpublished changes", createdAt: "Now", isActive: true },
    { id: "r3", label: "Refine hierarchy", description: "3 suggestions applied", createdAt: "18 min ago" },
    { id: "r2", label: "First audit", description: "Baseline capture", createdAt: "Today, 10:42" },
  ],
  suggestions: [{ id: "heading", title: "Tighten the primary message", summary: "The heading has a strong point of view, but its two-line break creates more friction than emphasis at this width.", rationale: "A more intentional measure will make the opening proposition easier to scan before the visitor reaches the collection.", impact: "High impact", status: "pending" }],
};

interface DesignWorkspaceProps {
  data?: WorkspaceData;
}

export function DesignWorkspace({ data = defaultData }: DesignWorkspaceProps) {
  const [activeRevisionId, setActiveRevisionId] = useState(data.revisions.find((revision) => revision.isActive)?.id ?? data.revisions[0]?.id ?? "");
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("canvas");
  const [designMode, setDesignMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(data.preview?.url);
  const [sandboxRunId, setSandboxRunId] = useState(data.preview?.runId);
  const [previewError, setPreviewError] = useState<string | null>(data.preview?.errorMessage ?? null);
  const [selectedElement, setSelectedElement] = useState<WorkspaceSelectedElement | null>(null);
  const [isStartingPreview, startPreviewTransition] = useTransition();
  const [isRefreshingPreview, startRefreshTransition] = useTransition();
  const [isDisconnecting, startDisconnectTransition] = useTransition();
  const [isAuditPending, startAuditTransition] = useTransition();
  const initialSuggestion = data.suggestions[0];
  const [suggestionStatus, setSuggestionStatus] = useState<ReviewStatus>(initialSuggestion?.status ?? "pending");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isDecisionPending, startDecisionTransition] = useTransition();
  const router = useRouter();
  const suggestion = initialSuggestion ? { ...initialSuggestion, status: suggestionStatus } : null;

  const markPreviewStopped = useCallback((message = "The sandbox preview has expired. Start a new preview to continue.") => {
    setPreviewUrl(undefined);
    setSandboxRunId(undefined);
    setPreviewError(message);
  }, []);

  useEffect(() => {
    if (!sandboxRunId || !previewUrl) return;

    let cancelled = false;
    async function probeInitialPreview() {
      const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs/${sandboxRunId}?probe=true`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { stopped?: boolean; sandboxRun?: { errorMessage?: string | null } } | null;
      if (!cancelled && response.ok && payload?.stopped) {
        markPreviewStopped(payload.sandboxRun?.errorMessage ?? undefined);
      }
    }

    void probeInitialPreview();
    return () => {
      cancelled = true;
    };
  }, [data.project.id, markPreviewStopped, previewUrl, sandboxRunId]);

  function decideSuggestion(status: "accepted" | "rejected") {
    if (!suggestion || suggestion.status !== "pending") return;

    setDecisionError(null);
    startDecisionTransition(async () => {
      const response = await fetch(`/api/suggestions/${suggestion.id}/${status === "accepted" ? "accept" : "reject"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: status === "rejected" ? JSON.stringify({}) : undefined,
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setDecisionError(payload?.error?.message ?? "Could not update this suggestion.");
        return;
      }

      setSuggestionStatus(status);
      router.refresh();
    });
  }

  function startPreview() {
    setPreviewError(null);
    startPreviewTransition(async () => {
      const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const payload = await response.json().catch(() => null) as { sandboxRun?: { id: string; previewUrl?: string; errorMessage?: string | null }; error?: { message?: string } } | null;
      if (!response.ok || !payload?.sandboxRun?.previewUrl) {
        setPreviewError(payload?.error?.message ?? payload?.sandboxRun?.errorMessage ?? "Preview could not be started.");
        return;
      }
      setSandboxRunId(payload.sandboxRun.id);
      setPreviewUrl(payload.sandboxRun.previewUrl);
      router.refresh();
    });
  }

  function refreshPreview(): Promise<boolean> {
    if (!sandboxRunId) return Promise.resolve(true);

    return new Promise((resolve) => {
      startRefreshTransition(async () => {
        const response = await fetch(`/api/projects/${data.project.id}/sandbox-runs/${sandboxRunId}?probe=true`, { cache: "no-store" });
        const payload = await response.json().catch(() => null) as { stopped?: boolean; sandboxRun?: { errorMessage?: string | null }; error?: { message?: string } } | null;
        if (!response.ok) {
          setPreviewError(payload?.error?.message ?? "Could not refresh the preview.");
          resolve(false);
          return;
        }
        if (payload?.stopped) {
          markPreviewStopped(payload.sandboxRun?.errorMessage ?? undefined);
          router.refresh();
          resolve(false);
          return;
        }

        setPreviewError(null);
        resolve(true);
      });
    });
  }

  function runPageAudit() {
    if (!previewUrl) {
      setAuditError("Start a preview before running a page audit.");
      return;
    }

    setActivePanel("audit");
    setAuditError(null);
    startAuditTransition(async () => {
      const targetResponse = await fetch("/api/reviews/targets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: data.project.id,
          sandboxRunId,
          pageUrl: previewUrl,
          domContext: { source: "workspace-page-audit" },
        }),
      });
      const targetPayload = await targetResponse.json().catch(() => null) as { reviewTarget?: { id: string }; error?: { message?: string } } | null;
      if (!targetResponse.ok || !targetPayload?.reviewTarget?.id) {
        setAuditError(targetPayload?.error?.message ?? "Could not create a review target.");
        return;
      }

      const reviewResponse = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: data.project.id,
          reviewTargetId: targetPayload.reviewTarget.id,
          scope: "PAGE",
          prompt: "Audit this page for hierarchy, motion, spacing, interaction clarity, and implementation-safe improvements.",
        }),
      });
      const reviewPayload = await reviewResponse.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!reviewResponse.ok) {
        setAuditError(reviewPayload?.error?.message ?? "Could not run the page audit.");
        return;
      }

      router.refresh();
    });
  }

  function disconnectProject() {
    if (!window.confirm(`Delete ${data.project.repository} from Destoc? This permanently deletes its Destoc reviews and revisions, but never the GitHub repository.`)) return;
    startDisconnectTransition(async () => {
      const response = await fetch(`/api/projects/${data.project.id}`, { method: "DELETE" });
      if (response.ok) router.push("/workspace");
      else setPreviewError("Project could not be deleted.");
    });
  }

  return (
    <div className="flex h-dvh min-h-[640px] flex-col overflow-hidden bg-[#131312] font-sans antialiased">
      <WorkspaceHeader
        project={data.project}
        onDisconnect={disconnectProject}
        isDisconnecting={isDisconnecting}
        hasPreview={Boolean(previewUrl)}
      />
      <div className="flex min-h-0 flex-1">
        <ProjectNavigation
          data={data}
          activeRevisionId={activeRevisionId}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          onRevisionChange={setActiveRevisionId}
          onRunPageAudit={runPageAudit}
          isAuditPending={isAuditPending}
        />
        <CanvasPreview
          designMode={designMode}
          previewUrl={previewUrl}
          onDesignModeChange={setDesignMode}
          onSelectionChange={(selection) => {
            setSelectedElement(selection);
            setActivePanel("audit");
          }}
          onStartPreview={startPreview}
          onRefreshPreview={refreshPreview}
          isStartingPreview={isStartingPreview}
          isRefreshingPreview={isRefreshingPreview}
          previewError={previewError}
          suggestionCount={data.suggestions.length}
        />
        <ReviewInspector
          activePanel={activePanel}
          selectedElement={selectedElement}
          suggestion={suggestion}
          onSuggestionStatusChange={decideSuggestion}
          onRunPageAudit={runPageAudit}
          isAuditPending={isAuditPending}
          auditError={auditError}
          isDecisionPending={isDecisionPending}
          decisionError={decisionError}
        />
      </div>
    </div>
  );
}
