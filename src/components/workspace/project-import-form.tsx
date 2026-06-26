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
        <p className="text-sm font-medium">Import a public repository</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">Destoc stores repository metadata only. Repository execution remains isolated from application credentials.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="github-url" className="text-zinc-300">GitHub repository URL</Label>
        <Input
          id="github-url"
          name="githubUrl"
          type="text"
          inputMode="url"
          placeholder="https://github.com/owner/repository"
          required
          aria-invalid={state.ok === false && Boolean(state.message)}
          className="border-white/10 bg-black/20 text-zinc-100 placeholder:text-zinc-700 focus-visible:border-[#f7ca58]/50 focus-visible:ring-[#f7ca58]/20"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="branch" className="text-zinc-300">Branch</Label>
        <Input
          id="branch"
          name="defaultBranch"
          defaultValue="main"
          maxLength={255}
          className="border-white/10 bg-black/20 text-zinc-100 placeholder:text-zinc-700 focus-visible:border-[#f7ca58]/50 focus-visible:ring-[#f7ca58]/20"
        />
      </div>
      {state.message ? (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm leading-5 text-rose-200">
          {state.message}
        </p>
      ) : null}
      {state.ok ? <p role="status" className="text-sm text-[#f7ca58]">Repository imported. Opening workspace…</p> : null}
      <Button type="submit" disabled={isPending} className="bg-[#f7ca58] text-[#1b1205] hover:bg-[#ffd879]">
        {isPending ? "Importing…" : "Import repository"}
      </Button>
    </form>
  );
}
