import Image from "next/image";
import Link from "next/link";

import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/workspace" : "/sign-up";
  const loginHref = user ? "/workspace" : "/sign-in";
  const loginLabel = user ? "Open workspace" : "Log in";

  return (
    <main className="min-h-dvh bg-[#202020] text-white">
      <section className="relative isolate h-dvh w-full overflow-hidden bg-[#171715]">
        <Image
          src="/destoc-hero-bg.png"
          alt="Pixel art workspace landscape with a laptop in a quiet outdoor setting"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_50%] saturate-[0.9] sm:object-center"
        />
        <div className="absolute inset-0 bg-black/[0.03]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,8,0.55)_0%,rgba(5,8,8,0.3)_27%,rgba(5,8,8,0.06)_62%,rgba(5,8,8,0.01)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/12 to-transparent" />

        <header className="absolute inset-x-0 top-0 z-20 flex h-20 items-center justify-between px-6 sm:px-10">
          <Link
            href="/"
            aria-label="Destoc home"
            className="inline-flex min-h-10 items-center gap-2 text-lg font-semibold tracking-[-0.03em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] transition-[opacity,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96]"
          >
            <DestocLogo className="h-6 min-w-6" markClassName="text-[18px]" />
            <span>Destoc</span>
          </Link>
          <Link
            href={loginHref}
            className="inline-flex min-h-10 items-center rounded-lg bg-black/38 px-4 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_8px_28px_rgba(0,0,0,0.16)] backdrop-blur-md transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-black/52 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.24),0_10px_32px_rgba(0,0,0,0.22)] active:scale-[0.96]"
          >
            {loginLabel}
          </Link>
        </header>

        <div className="relative z-10 flex h-full items-center px-6 pb-4 pt-20 sm:px-10">
          <div className="max-w-[620px]">
            <h1 className="text-balance text-[42px] font-semibold leading-[0.98] tracking-[-0.055em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)] sm:text-[60px] lg:text-[68px]">
              Review interfaces before you ship.
            </h1>
            <p className="mt-5 max-w-[500px] text-pretty text-base font-medium leading-7 text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-lg">
              Import a public GitHub repo, inspect the preview, and test UI fixes in a safe sandbox.
            </p>
            <div className="mt-7 flex">
              <Link
                href={primaryHref}
                className="inline-flex min-h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold leading-none text-[#10100f] shadow-[0_14px_40px_rgba(0,0,0,0.26)] transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-[#f7ca58] hover:shadow-[0_16px_44px_rgba(0,0,0,0.32)] active:scale-[0.96]"
              >
                {user ? "Continue reviewing" : "Start a review"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
