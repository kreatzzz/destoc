"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

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
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <form
        action={handleSubmit}
        className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl shadow-black/20"
      >
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Destoc
        </Link>
        <h1 className="mt-7 text-xl font-semibold tracking-tight">
          {isSignUp ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp
            ? "Start with an email and password. You can import a public repository after sign-in."
            : "Sign in to review the projects in your workspace."}
        </p>

        <div className="mt-6 grid gap-4">
          {isSignUp ? (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" maxLength={100} />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>
        </div>

        {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}

        <Button className="mt-6 w-full" type="submit" disabled={isPending}>
          {isPending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href={isSignUp ? "/sign-in" : "/sign-up"}>
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </form>
    </main>
  );
}
