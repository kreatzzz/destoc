"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createProjectAction, type WorkspaceFormState } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WorkspaceFormState = { ok: false };

export function ProjectImportForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, isPending] = useActionState(createProjectAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.projectId) router.push(`/workspace/${state.projectId}`);
  }, [router, state.ok, state.projectId]);

  return (
    <form action={action} className="grid gap-4 rounded-xl border bg-card p-5">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div>
        <p className="text-sm font-medium">Import a public repository</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Destoc stores repository metadata only. Repository execution remains isolated from application credentials.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="github-url">GitHub repository URL</Label>
        <Input id="github-url" name="githubUrl" type="url" placeholder="https://github.com/owner/repository" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="branch">Branch</Label>
        <Input id="branch" name="defaultBranch" defaultValue="main" maxLength={255} />
      </div>
      {state.message ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      {state.ok ? <p role="status" className="text-sm text-emerald-400">Repository imported. Opening workspace…</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? "Importing…" : "Import repository"}</Button>
    </form>
  );
}
