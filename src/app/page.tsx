import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#202020] text-white">
      <section className="relative isolate h-dvh w-full overflow-hidden bg-[#171715]">
        <Image
          src="/destoc-hero-bg.png"
          alt="Pixel art workspace landscape with a laptop in a quiet outdoor setting"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_50%] sm:object-center"
        />

        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
          <Link href="/" className="text-lg font-semibold tracking-[-0.03em] text-[#f4f0e8]">
            Destoc
          </Link>
          <Link
            href="/sign-in"
            className="rounded-[7px] bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/16"
          >
            Log in
          </Link>
        </header>

        <div className="relative z-10 px-6 pt-[118px] sm:px-10 sm:pt-[128px] lg:pt-[132px]">
          <div className="max-w-[560px]">
            <h1 className={`${playfairDisplay.className} text-[42px] font-semibold leading-[0.98] tracking-normal text-pretty text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.42)] sm:text-[62px] lg:text-[72px]`}>
              Review interfaces before you ship.
            </h1>
            <p className="mt-5 max-w-[470px] text-base font-medium leading-7 text-pretty text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.36)] sm:text-lg">
              Import a public GitHub repo, inspect the preview, and test UI fixes in a safe sandbox.
            </p>
            <div className="mt-7 flex">
              <Link
                href="/sign-up"
                className="inline-flex rounded-[7px] bg-white px-5 py-3 text-sm font-semibold leading-none text-[#10100f] shadow-[0_14px_40px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                Start a review
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
