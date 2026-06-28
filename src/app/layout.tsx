import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Agentation } from "agentation";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const showAgentation = process.env.NEXT_PUBLIC_SHOW_AGENTATION !== "false";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Destoc — Design review workspace",
  description: "Review interface design, preserve context, and test improvements safely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <TooltipProvider>
          {children}
          {process.env.NODE_ENV === "development" && showAgentation ? <Agentation /> : null}
        </TooltipProvider>
      </body>
    </html>
  );
}
