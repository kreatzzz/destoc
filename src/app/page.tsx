import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <section className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl shadow-black/20">
        <div className="mb-7 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">Destoc</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Design review workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Connect a public project, inspect its interface, and preserve the improvements worth keeping.
        </p>
        <div className="mt-7 grid gap-2">
          <Button asChild>
            <Link href="/sign-in">Sign in <ArrowRight /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">Create an account</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
