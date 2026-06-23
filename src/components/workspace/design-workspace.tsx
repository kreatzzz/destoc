"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { WorkspaceHeader } from "@/components/app-shell/workspace-header";
import { CanvasPreview } from "./canvas-preview";
import { ProjectNavigation } from "./project-navigation";
import { ReviewInspector } from "./review-inspector";
import type { ReviewStatus, WorkspaceData } from "./types";

const defaultData: WorkspaceData = {
  project: { id: "objects", name: "Objects collection", repository: "miloh/objects", branch: "main", updatedAt: "Just now", revisionCount: 4 },
  revisions: [
    { id: "current", label: "Current canvas", description: "Unpublished changes", createdAt: "Now", isActive: true },
    { id: "r3", label: "Refine hierarchy", description: "3 suggestions applied", createdAt: "18 min ago" },
    { id: "r2", label: "First audit", description: "Baseline capture", createdAt: "Today, 10:42" },
  ],
  suggestions: [{ id: "heading", title: "Tighten the primary message", summary: "The heading has a strong point of view, but its two-line break creates more friction than emphasis at this width.", rationale: "A more intentional measure will make the opening proposition easier to scan before the visitor reaches the collection.", impact: "High impact", status: "pending" }],
};

interface DesignWorkspaceProps { data?: WorkspaceData; }

export function DesignWorkspace({ data = defaultData }: DesignWorkspaceProps) {
  const [activeRevisionId, setActiveRevisionId] = useState(data.revisions.find((revision) => revision.isActive)?.id ?? data.revisions[0]?.id ?? "");
  const [designMode, setDesignMode] = useState(true);
  const initialSuggestion = data.suggestions[0];
  const [suggestionStatus, setSuggestionStatus] = useState<ReviewStatus>(initialSuggestion?.status ?? "pending");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isDecisionPending, startDecisionTransition] = useTransition();
  const router = useRouter();
  const suggestion = initialSuggestion ? { ...initialSuggestion, status: suggestionStatus } : null;

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

  return <div className="flex h-dvh min-h-[640px] flex-col overflow-hidden bg-[#131312] font-sans antialiased">
    <WorkspaceHeader project={data.project} />
    <div className="flex min-h-0 flex-1">
      <ProjectNavigation data={data} activeRevisionId={activeRevisionId} onRevisionChange={setActiveRevisionId} />
      <CanvasPreview designMode={designMode} onDesignModeChange={setDesignMode} />
      <ReviewInspector
        suggestion={suggestion}
        onSuggestionStatusChange={decideSuggestion}
        isDecisionPending={isDecisionPending}
        decisionError={decisionError}
      />
    </div>
  </div>;
}
