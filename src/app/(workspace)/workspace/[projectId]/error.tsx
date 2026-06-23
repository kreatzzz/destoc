"use client";

import { Button } from "@/components/ui/button";

export default function ProjectWorkspaceError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <section className="max-w-md rounded-xl border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">Unable to open this workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">The project could not be loaded. Check your connection and try again.</p>
        <Button className="mt-5" onClick={reset}>Try again</Button>
      </section>
    </main>
  );
}
