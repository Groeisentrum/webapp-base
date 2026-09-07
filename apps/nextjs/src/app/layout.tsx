import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/app/AppProviders";

export const metadata: Metadata = {
  title: "Webapp Base",
  description: "Herbruikbare webtoepassing-sjabloon",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="af">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
