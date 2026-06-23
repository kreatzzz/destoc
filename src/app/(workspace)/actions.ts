"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth";
import { asAppError } from "@/lib/errors";
import { createProject, createWorkspace } from "@/server";

export type WorkspaceFormState = {
  ok: boolean;
  message?: string;
};

export async function createWorkspaceAction(
  _previous: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  try {
    const user = await requireCurrentUser();
    await createWorkspace(user.id, { name: formData.get("name") });
    revalidatePath("/workspace");
    return { ok: true };
  } catch (error) {
    const appError = asAppError(error);
    return { ok: false, message: appError.expose ? appError.message : "Could not create the workspace." };
  }
}

export async function createProjectAction(
  _previous: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  try {
    const user = await requireCurrentUser();
    await createProject(user.id, {
      workspaceId: formData.get("workspaceId"),
      githubUrl: formData.get("githubUrl"),
      defaultBranch: formData.get("defaultBranch") || "main",
    });
    revalidatePath("/workspace");
    return { ok: true };
  } catch (error) {
    const appError = asAppError(error);
    return { ok: false, message: appError.expose ? appError.message : "Could not import the repository." };
  }
}
