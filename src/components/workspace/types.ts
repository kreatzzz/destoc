export type ReviewStatus = "pending" | "accepted" | "rejected";

export interface WorkspaceProject {
  id: string;
  name: string;
  repository: string;
  branch: string;
  updatedAt: string;
  revisionCount: number;
}

export interface WorkspaceRevision {
  id: string;
  label: string;
  description: string;
  createdAt: string;
  isActive?: boolean;
}

export interface WorkspaceSuggestion {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  impact: "High impact" | "Medium impact" | "Low impact";
  status: ReviewStatus;
  patch?: string | null;
  verificationChecklist?: string[];
}

export interface WorkspacePreview {
  runId?: string;
  status?: "QUEUED" | "PROVISIONING" | "BUILDING" | "READY" | "FAILED" | "STOPPED";
  url?: string;
  errorMessage?: string | null;
}

export interface WorkspaceSelectedElement {
  selector: string;
  role: string | null;
  text: string;
  note?: string;
  domPath: string[];
  classes: string[];
  computedStyles: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageUrl: string;
}

export interface WorkspaceChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export interface WorkspaceData {
  project: WorkspaceProject;
  revisions: WorkspaceRevision[];
  suggestions: WorkspaceSuggestion[];
  preview?: WorkspacePreview;
}
