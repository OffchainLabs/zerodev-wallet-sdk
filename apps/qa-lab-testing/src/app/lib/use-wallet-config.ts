"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  pickConfigParams,
  type ResolvedWalletConfig,
  resolveWalletConfig,
  withConfig,
} from "./config-params";

/** The effective wallet config for the current URL, plus what was overridden. */
export function useResolvedConfig(): ResolvedWalletConfig {
  const searchParams = useSearchParams();
  const configKey = pickConfigParams(searchParams).toString();

  return useMemo(
    () => resolveWalletConfig(new URLSearchParams(configKey)),
    [configKey],
  );
}

/**
 * Builds hrefs that keep the active config. For places that need a URL string
 * rather than a component — `window.location.assign`, redirects after logout.
 */
export function useConfigHref(): (href: string) => string {
  const searchParams = useSearchParams();
  const configKey = pickConfigParams(searchParams).toString();

  return useMemo(() => {
    const params = new URLSearchParams(configKey);
    return (href: string) => withConfig(href, params);
  }, [configKey]);
}
