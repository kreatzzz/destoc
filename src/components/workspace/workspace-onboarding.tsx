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
    <section className="mx-auto grid w-full max-w-lg gap-6 rounded-3xl bg-white/[0.045] p-6 text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_24px_80px_rgba(0,0,0,0.32)]">
      <div>
        <p className="text-sm font-medium">Create a workspace</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">A workspace holds projects, review context, and accepted draft revisions.</p>
      </div>
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name" className="text-zinc-300">Workspace name</Label>
          <Input
            id="workspace-name"
            name="name"
            placeholder="Personal workspace"
            required
            maxLength={100}
            className="border-white/10 bg-black/20 text-zinc-100 placeholder:text-zinc-700 focus-visible:border-[#f7ca58]/50 focus-visible:ring-[#f7ca58]/20"
          />
        </div>
        {state.message ? <p role="alert" className="text-sm text-rose-300">{state.message}</p> : null}
        <Button type="submit" disabled={isPending} className="bg-[#f7ca58] text-[#1b1205] hover:bg-[#ffd879]">
          {isPending ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </section>
  );
}
