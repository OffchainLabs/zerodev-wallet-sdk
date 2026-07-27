"use client";

import { ZeroDevLogo } from "@zerodev/react-ui";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-0 border-b border-[var(--border-warm)] bg-white/95 font-[var(--font-dm-sans)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:h-[88px] lg:px-9 lg:py-0">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 sm:gap-3"
          data-testid="header-home-link"
        >
          <ZeroDevLogo
            variant="lockup"
            tone="black"
            className="h-7 w-auto shrink-0 sm:h-9"
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9c958c] sm:text-xs">
            QA Lab
          </span>
        </Link>

        <Link
          href="/environment"
          className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2a1c13] sm:h-12 sm:px-5"
          data-testid="header-environment-link"
        >
          <span className="truncate">Environment</span>
          <span className="ml-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[var(--ink)] sm:h-7 sm:w-7">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          </span>
        </Link>
      </div>
    </header>
  );
}
