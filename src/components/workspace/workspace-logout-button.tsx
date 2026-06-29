"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { AnimatedLogoutIcon } from "@/components/ui/animated-icons";
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
      className="h-10 gap-2 rounded-md px-2.5 text-xs text-zinc-500 transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.06] hover:text-zinc-200 active:scale-[0.96]"
    >
      <span className="grid size-5 place-items-center">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <AnimatedLogoutIcon size={17} />}
      </span>
      Log out
    </Button>
  );
}
