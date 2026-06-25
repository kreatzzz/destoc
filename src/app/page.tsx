import Link from "next/link";

import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { AnimatedArrowRightIcon } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <section className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl shadow-black/20">
        <div className="mb-7 flex items-center gap-2">
          <DestocLogo />
          <span className="font-semibold tracking-tight">Destoc</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Design review workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Connect a public project, inspect its interface, and preserve the improvements worth keeping.
        </p>
        <div className="mt-7 grid gap-2">
          <Button asChild>
            <Link href="/sign-in">Sign in <AnimatedArrowRightIcon /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">Create an account</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
