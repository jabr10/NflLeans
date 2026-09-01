import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { PRODUCT_TAGLINE } from "@/lib/boardCopy";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const condensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["800"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Footage",
  description: PRODUCT_TAGLINE,
  openGraph: {
    title: "Footage",
    description: PRODUCT_TAGLINE,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F6FA" },
    { media: "(prefers-color-scheme: dark)", color: "#07090C" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${condensed.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
