import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/app/AppProviders";

/**
 * The face the Voortrekkermonument itself uses. Self-hosted by next/font at build
 * time rather than fetched from Google at run time, so there is no third-party
 * request, no layout shift, and it still works for a visitor on poor mobile data.
 */
const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Webapp Base",
  description: "Herbruikbare webtoepassing-sjabloon",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="af" className={openSans.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
