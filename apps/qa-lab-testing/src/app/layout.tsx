import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from './providers';

/**
 * Forced dynamic for every route.
 *
 * The wallet config is resolved from query params, and `useSearchParams()`
 * returns empty during the *static* render pass — the server would build a
 * default config while the client built an overridden one, and any
 * chain-derived UI would mismatch on hydration. Dynamic rendering gives both
 * passes the real params. Static optimisation is worth nothing to a QA tool.
 */
export const dynamic = "force-dynamic";

import "@zerodev/wallet-react-ui/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZeroDev QA Lab",
  description: "QA testing lab for the ZeroDev Wallet SDK — e2e and manual testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} antialiased`}
      >
        {/* Providers reads search params, which requires a Suspense boundary. */}
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
