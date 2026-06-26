"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function WorkspaceLogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    const result = await authClient.signOut();
    if (result.error) {
      setIsPending(false);
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => void signOut()}
      disabled={isPending}
      className="gap-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Log out
    </Button>
  );
}
