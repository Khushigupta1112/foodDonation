import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FoodShare — Rescue food, feed people",
    template: "%s · FoodShare",
  },
  description:
    "A food donation platform that connects donors with extra food to NGOs, shelters and volunteers who can pick it up before it goes to waste.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/8 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-gray-500 sm:flex-row">
            <span>🍽️ FoodShare — rescue food, feed people.</span>
            <div className="flex gap-4">
              <Link href="/browse" className="hover:text-brand">
                Browse
              </Link>
              <Link href="/donate" className="hover:text-brand">
                Donate
              </Link>
              <Link href="/dashboard" className="hover:text-brand">
                Dashboard
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
