import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { ThemeScript } from "@/components/ThemeScript";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "NflLeans",
  description: "Weekly NFL betting research. Not a sportsbook.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#14120e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <header className="masthead">
          <div className="masthead-row">
            <Link href="/" className="brand tap-target">
              <span className="brand-mark">NflLeans</span>
            </Link>
            <ThemeToggle />
          </div>
          <p className="mast-eyebrow">Weekly betting research · not a sportsbook.</p>
        </header>
        {children}
      </body>
    </html>
  );
}
