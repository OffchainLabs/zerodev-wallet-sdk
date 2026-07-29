"use client";

import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { withConfig } from "../lib/config-params";

/**
 * `next/link` that carries the active wallet-config params forward.
 *
 * Every internal link in the app must use this. A plain `<Link href="/sra">`
 * drops the query string, which silently reverts the config to defaults — and
 * because a config change rebuilds the connector, it also logs you out. The
 * failure is invisible: the page looks right, it's just no longer running the
 * config you asked for.
 *
 * `eslint no-restricted-imports` bans `next/link` everywhere but this file, so
 * a future link can't quietly reintroduce the bug.
 *
 * Safe to render from server components — it's a client component, and the
 * root layout already provides the Suspense boundary `useSearchParams` needs.
 */
export function ConfigLink({
  href,
  ...rest
}: ComponentProps<typeof NextLink>) {
  const searchParams = useSearchParams();
  const target =
    typeof href === "string" ? withConfig(href, searchParams) : href;

  return <NextLink href={target} {...rest} />;
}
