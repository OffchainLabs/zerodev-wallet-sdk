import { arbitrumSepolia, sepolia } from "wagmi/chains";

/**
 * Single source of truth for the wallet setup, shared by `wagmi-config.tsx`
 * and the `/environment` diagnostics page.
 *
 * Kept in a plain module (no `"use client"`) precisely so the server-rendered
 * environment page can import it. Importing `wagmi-config.tsx` directly would
 * not work — Next turns every export of a client module into an opaque client
 * reference on the server, and it would run `createConfig()` server-side as a
 * side effect.
 *
 * The point of sharing these is that the diagnostics page reports what the app
 * is *actually* configured with, rather than a hand-maintained copy that
 * silently goes stale.
 */
export const SUPPORTED_CHAINS = [arbitrumSepolia, sepolia] as const;

export const ENABLED_AUTH_METHODS = ["email"] as const;

/**
 * Per-chain RPC overrides. A chain missing from here — or with an empty value —
 * falls back to viem's default public RPC for that chain, since `http(undefined)`
 * resolves to the chain's own `rpcUrls.default`.
 */
export const RPC_URLS: Record<number, string | undefined> = {
  [arbitrumSepolia.id]: process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL,
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
};

/** A transport counts as explicitly set when its RPC override is non-empty. */
export const hasExplicitTransport = (chainId: number) =>
  Boolean(RPC_URLS[chainId]?.trim());
