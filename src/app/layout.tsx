import type { Metadata } from "next";
import Link from "next/link";
import { Nunito } from "next/font/google";

import { BrandMark } from "@/components/BrandMark";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ai-image-gen",
  description: "Turn a prompt into a finished graphic.",
  icons: { icon: "/brand/logo-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-base text-text-primary">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-lg font-extrabold tracking-tight">ai-image-gen</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
