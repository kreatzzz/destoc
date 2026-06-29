"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { AnimatedArrowRightIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSignUp = mode === "sign-up";

  function handleSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    startTransition(async () => {
      const result = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password, rememberMe: true });

      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
        return;
      }

      router.replace("/workspace");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid gap-4">
        {isSignUp ? (
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-medium text-zinc-300">Name</Label>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              maxLength={100}
              className="h-12 rounded-xl border-0 bg-black/25 px-4 text-sm text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)] transition-[background-color,box-shadow] duration-150 placeholder:text-zinc-600 focus-visible:bg-black/35 focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(247,202,88,0.5),0_0_0_3px_rgba(247,202,88,0.08)]"
            />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-xs font-medium text-zinc-300">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12 rounded-xl border-0 bg-black/25 px-4 text-sm text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)] transition-[background-color,box-shadow] duration-150 placeholder:text-zinc-600 focus-visible:bg-black/35 focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(247,202,88,0.5),0_0_0_3px_rgba(247,202,88,0.08)]"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-xs font-medium text-zinc-300">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="h-12 rounded-xl border-0 bg-black/25 px-4 text-sm text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)] transition-[background-color,box-shadow] duration-150 placeholder:text-zinc-600 focus-visible:bg-black/35 focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(247,202,88,0.5),0_0_0_3px_rgba(247,202,88,0.08)]"
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-xl bg-rose-400/10 px-3 py-2.5 text-xs leading-5 text-rose-200 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.16)]"
        >
          {error}
        </p>
      ) : null}

      <Button
        className="mt-6 h-12 w-full rounded-xl bg-[#f7ca58] px-4 font-semibold text-[#1f1605] shadow-[0_12px_28px_rgba(247,202,88,0.12)] transition-[background-color,box-shadow,scale] duration-150 hover:bg-[#ffd978] hover:shadow-[0_16px_34px_rgba(247,202,88,0.18)] active:scale-[0.96]"
        type="submit"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Please wait…
          </>
        ) : (
          <>
            {isSignUp ? "Create account" : "Sign in"}
            <AnimatedArrowRightIcon size={16} />
          </>
        )}
      </Button>

      <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
        Public repositories only. Preview execution stays isolated from application credentials.
      </p>
    </form>
  );
}
