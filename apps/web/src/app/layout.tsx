import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Syne } from "next/font/google";
import { ApolloAppProvider } from "@/lib/apollo-provider";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse — Live stream intelligence",
  description: "Real-time Twitch and YouTube sentiment, brands, and operator recommendations",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontVars = {
    "--font-display": "var(--font-syne), ui-sans-serif, system-ui, sans-serif",
    "--font-body": "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
    "--font-mono": "var(--font-plex-mono), ui-monospace, monospace",
  } as CSSProperties;

  return (
    <html lang="en" className={`${syne.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-body antialiased" style={fontVars}>
        <ApolloAppProvider>{children}</ApolloAppProvider>
      </body>
    </html>
  );
}
