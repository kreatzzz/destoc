import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";

import { DestocLogo } from "@/components/app-shell/destoc-logo";
import { getCurrentUser } from "@/lib/auth";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

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
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,8,0.82)_0%,rgba(5,8,8,0.58)_27%,rgba(5,8,8,0.13)_62%,rgba(5,8,8,0.04)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/35 to-transparent" />

        <header className="absolute inset-x-0 top-0 z-20 flex h-20 items-center justify-between px-6 sm:px-10">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center text-lg font-semibold tracking-[-0.03em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] transition-[opacity,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96]"
          >
            Destoc
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={loginHref}
              className="inline-flex min-h-10 items-center rounded-lg bg-black/45 px-4 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-black/60 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.24),0_10px_32px_rgba(0,0,0,0.24)] active:scale-[0.96]"
            >
              {loginLabel}
            </Link>
            <Link
              href="/"
              aria-label="Destoc home"
              className="grid size-10 place-items-center rounded-lg bg-black/45 text-[#f7ca58] shadow-[0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur-md transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-black/60 hover:shadow-[0_0_0_1px_rgba(247,202,88,0.35)] active:scale-[0.96]"
            >
              <DestocLogo className="h-6 min-w-6" markClassName="text-[18px]" />
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex h-full items-center px-6 pb-4 pt-20 sm:px-10">
          <div className="max-w-[620px] border-l border-white/35 pl-5 sm:pl-7">
            <h1 className={`${playfairDisplay.className} text-balance text-[42px] font-semibold leading-[0.98] tracking-[-0.025em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)] sm:text-[60px] lg:text-[68px]`}>
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
