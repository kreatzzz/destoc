import { getPrisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function requireWorkspaceOwnership(workspaceId: string, userId: string) {
  const workspace = await getPrisma().workspace.findFirst({
    where: { id: workspaceId, userId },
  });

  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found.");
  }

  return workspace;
}

export async function requireProjectOwnership(projectId: string, userId: string) {
  const project = await getPrisma().project.findFirst({
    where: {
      id: projectId,
      workspace: { userId },
    },
  });

  if (!project) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }

  return project;
}

export async function requireReviewOwnership(reviewId: string, userId: string) {
  const review = await getPrisma().review.findFirst({
    where: {
      id: reviewId,
      project: { workspace: { userId } },
    },
  });

  if (!review) {
    throw new AppError("NOT_FOUND", "Review not found.");
  }

  return review;
}

export async function requireSuggestionOwnership(suggestionId: string, userId: string) {
  const suggestion = await getPrisma().suggestion.findFirst({
    where: {
      id: suggestionId,
      review: { project: { workspace: { userId } } },
    },
    include: {
      review: {
        include: {
          reviewTarget: true,
        },
      },
    },
  });

  if (!suggestion) {
    throw new AppError("NOT_FOUND", "Suggestion not found.");
  }

  return suggestion;
}
