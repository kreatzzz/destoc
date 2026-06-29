import Link from "next/link";

import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { AuthForm, type AuthMode } from "@/components/auth/auth-form";

const reviewSteps = [
  { number: "01", label: "Connect", detail: "Import a public repository" },
  { number: "02", label: "Inspect", detail: "Select UI in the live preview" },
  { number: "03", label: "Improve", detail: "Apply changes in the sandbox" },
];

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="relative isolate min-h-dvh overflow-x-hidden bg-[#0e0e0d] text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_14%,rgba(247,202,88,0.13),transparent_30%),radial-gradient(circle_at_88%_86%,rgba(247,202,88,0.06),transparent_26%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-5 py-5 sm:px-7 sm:py-6 lg:px-9">
        <header className="flex h-12 items-center justify-between">
          <Link
            href="/"
            aria-label="Destoc home"
            className="group inline-flex min-h-10 items-center gap-2 rounded-xl pr-3 text-sm font-semibold tracking-[-0.025em] text-zinc-100 transition-[background-color,color] duration-150 hover:bg-white/[0.04]"
          >
            <DestocLogo className="h-10 min-w-10" markClassName="text-[24px]" />
            <span>Destoc</span>
          </Link>
          <p className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            {isSignUp ? "Already have a workspace?" : "New to Destoc?"}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="inline-flex min-h-10 items-center rounded-xl px-3 font-medium text-zinc-200 transition-[background-color,color] duration-150 hover:bg-white/[0.06] hover:text-white"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </Link>
          </p>
        </header>

        <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.72fr)] lg:gap-16 lg:py-10 xl:gap-24">
          <section className="hidden min-w-0 lg:block">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f7ca58]">
                Design review, in context
              </p>
              <h2 className="mt-5 max-w-[620px] text-balance text-[clamp(2.7rem,4.6vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-zinc-50">
                Turn interface notes into working changes.
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-400">
                Review the real product, attach feedback to exact components, and test every improvement in an isolated sandbox.
              </p>
            </div>

            <div className="mt-7 overflow-hidden rounded-[30px] bg-[#151513] p-3 shadow-[0_32px_90px_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(255,255,255,0.075)]">
              <div className="flex h-12 items-center justify-between rounded-[20px] bg-black/25 px-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-[#f7ca58]">D.</span>
                  <span className="h-4 w-px bg-white/10" />
                  <span className="truncate text-xs text-zinc-400">dey11 / hanabi</span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.045] px-3 py-1.5 text-[11px] text-zinc-400">
                  <span className="size-1.5 rounded-full bg-[#f7ca58] shadow-[0_0_10px_rgba(247,202,88,0.7)]" />
                  Preview live
                </span>
              </div>

              <div className="mt-3 grid min-h-[215px] grid-cols-[190px_minmax(0,1fr)] gap-3">
                <div className="flex flex-col rounded-[20px] bg-[#10100f] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                  <div className="rounded-2xl bg-white/[0.055] p-3">
                    <p className="text-[11px] leading-4 text-zinc-300">
                      Tighten the hero hierarchy and make the primary action easier to scan.
                    </p>
                  </div>
                  <div className="mt-3 rounded-2xl bg-[#f7ca58] p-3 text-[#211704]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">Selected</p>
                    <p className="mt-1 truncate text-xs font-medium">#1 Hero section</p>
                  </div>
                  <div className="mt-auto rounded-2xl bg-white/[0.035] p-3">
                    <div className="h-2 w-3/4 rounded-full bg-white/10" />
                    <div className="mt-2 h-2 w-1/2 rounded-full bg-white/[0.06]" />
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[20px] bg-[#ebe7dd] p-5 text-[#171714] shadow-[inset_0_0_0_1px_rgba(16,16,15,0.12)]">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg font-semibold tracking-[-0.04em]">Hanabi</span>
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-8 rounded-full bg-black/15" />
                      <span className="h-1.5 w-5 rounded-full bg-black/10" />
                    </div>
                  </div>
                  <div className="relative mt-9 max-w-[380px]">
                    <span className="absolute -left-2 top-0 h-full w-0.5 rounded-full bg-[#7c3aed]" />
                    <span className="absolute -left-5 -top-4 grid size-5 place-items-center rounded-full bg-[#7c3aed] text-[10px] font-semibold text-white shadow-lg">
                      1
                    </span>
                    <p className="text-[clamp(1.7rem,3vw,3rem)] font-semibold leading-[0.94] tracking-[-0.06em]">
                      Interfaces worth looking at twice.
                    </p>
                    <p className="mt-4 max-w-xs text-xs leading-5 text-black/55">
                      Review decisions where they happen, then keep the useful context attached.
                    </p>
                    <span className="mt-5 inline-flex rounded-full bg-[#171714] px-4 py-2 text-[11px] font-medium text-white">
                      Start a review
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-16 -right-10 size-48 rounded-full border-[34px] border-[#f7ca58]/70"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {reviewSteps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl bg-white/[0.035] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-[#f7ca58]">{step.number}</span>
                    <span className="text-xs font-medium text-zinc-200">{step.label}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-600">{step.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[440px] lg:mx-0 lg:ml-auto">
            <div className="rounded-[30px] bg-[#171715] p-2 shadow-[0_32px_100px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.075)]">
              <div className="rounded-[24px] bg-[#1d1d1a] px-5 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)] sm:px-7 sm:py-8">
                <div className="mb-8">
                  <p className="text-xs font-medium uppercase tracking-[0.17em] text-[#f7ca58]">
                    {isSignUp ? "Start reviewing" : "Continue reviewing"}
                  </p>
                  <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.05em] text-zinc-50">
                    {isSignUp ? "Create your workspace" : "Welcome back"}
                  </h1>
                  <p className="mt-3 text-pretty text-sm leading-6 text-zinc-500">
                    {isSignUp
                      ? "Set up your account, then connect the first interface you want to improve."
                      : "Sign in to return to your repositories, reviews, and sandbox changes."}
                  </p>
                </div>

                <AuthForm mode={mode} />
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-zinc-600 sm:hidden">
              {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
              <Link
                className="inline-flex min-h-10 items-center font-medium text-zinc-300 underline decoration-white/20 underline-offset-4"
                href={isSignUp ? "/sign-in" : "/sign-up"}
              >
                {isSignUp ? "Sign in" : "Create one"}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
