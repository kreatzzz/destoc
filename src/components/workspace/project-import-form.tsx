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
    <form action={action} className="grid gap-4 text-zinc-100" noValidate>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div>
        <p className="text-sm font-medium tracking-[-0.01em]">Import repository</p>
        <p className="mt-1 text-pretty text-xs leading-5 text-zinc-500">Connect a public GitHub repository. Execution stays isolated from application credentials.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="github-url" className="text-xs text-zinc-400">Repository URL</Label>
        <Input
          id="github-url"
          name="githubUrl"
          type="text"
          inputMode="url"
          placeholder="https://github.com/owner/repository"
          required
          aria-invalid={state.ok === false && Boolean(state.message)}
          className="h-9 rounded-md border-white/10 bg-[#0a0a0a] px-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus-visible:border-[#f7ca58]/50 focus-visible:ring-[#f7ca58]/20"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="branch" className="text-xs text-zinc-400">Branch</Label>
        <Input
          id="branch"
          name="defaultBranch"
          defaultValue="main"
          maxLength={255}
          className="h-9 rounded-md border-white/10 bg-[#0a0a0a] px-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus-visible:border-[#f7ca58]/50 focus-visible:ring-[#f7ca58]/20"
        />
      </div>
      {state.message ? (
        <p role="alert" className="rounded-md bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-200">
          {state.message}
        </p>
      ) : null}
      {state.ok ? <p role="status" className="text-xs text-[#f7ca58]">Repository imported. Opening workspace…</p> : null}
      <Button type="submit" disabled={isPending} className="h-9 rounded-md bg-[#f7ca58] text-sm text-[#1b1205] transition-[background-color,scale] duration-150 ease-out hover:bg-[#ffd879] active:scale-[0.96]">
        {isPending ? "Importing…" : "Import repository"}
      </Button>
    </form>
  );
}
