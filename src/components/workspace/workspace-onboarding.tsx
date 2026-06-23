"use client";

import { useActionState } from "react";

import { createWorkspaceAction, type WorkspaceFormState } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WorkspaceFormState = { ok: false };

export function WorkspaceOnboarding() {
  const [state, action, isPending] = useActionState(createWorkspaceAction, initialState);

  return (
    <section className="mx-auto grid w-full max-w-lg gap-6 rounded-xl border bg-card p-6">
      <div>
        <p className="text-sm font-medium">Create a workspace</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">A workspace holds projects, review context, and accepted draft revisions.</p>
      </div>
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input id="workspace-name" name="name" placeholder="Personal workspace" required maxLength={100} />
        </div>
        {state.message ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create workspace"}</Button>
      </form>
    </section>
  );
}
