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
}

export interface WorkspaceData {
  project: WorkspaceProject;
  revisions: WorkspaceRevision[];
  suggestions: WorkspaceSuggestion[];
}
