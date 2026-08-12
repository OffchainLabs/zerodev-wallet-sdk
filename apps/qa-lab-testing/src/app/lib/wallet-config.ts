import { anvil, arbitrum, arbitrumSepolia, mainnet, sepolia } from "wagmi/chains";

/**
 * Single source of truth for the wallet setup, shared by `wagmi-config.tsx`,
 * the `/environment` diagnostics page and the `/config` URL builder.
 *
 * Kept in a plain module (no `"use client"`) precisely so server-rendered pages
 * can import it. Importing `wagmi-config.tsx` directly would not work — Next
 * turns every export of a client module into an opaque client reference on the
 * server, and it would run `createConfig()` server-side as a side effect.
 */

/**
 * Every chain selectable via `?chains=`. Not an SDK constraint — `wallet-core`
 * has no whitelist — but the ZeroDev project and bundler must support whatever
 * is picked, so an open-ended list would just fail at runtime.
 */
export const CHAIN_CATALOG = [
  arbitrumSepolia,
  sepolia,
  arbitrum,
  mainnet,
  anvil,
] as const;

/** The selection used when `?chains=` is absent. */
export const SUPPORTED_CHAINS = [arbitrumSepolia, sepolia] as const;

/**
 * Defaults for anything overridable via URL params (see `config-params.ts`).
 * These are what the app runs with when no params are present.
 */
export const DEFAULT_AUTH_METHODS = ["email", "google", "passkey"] as const;

const ZERODEV_STAGING_RPC_BASE = "https://staging-rpc.zerodev.app/api/v3";

export const ANVIL_CHAIN_ID = anvil.id;

/** Anvil runs locally, so it can't route through a hosted RPC. */
export const ANVIL_RPC_URL =
  process.env.NEXT_PUBLIC_ANVIL_URL || "http://localhost:18545";

/** The magic-link-configured project id. */
export const MAGIC_LINK_PROJECT_ID = process.env.NEXT_PUBLIC_ZD_PROJECT_ID;

/** The OTP-configured project id. */
export const OTP_PROJECT_ID = process.env.NEXT_PUBLIC_ZD_OTP_PROJECT_ID;

/**
 * Authentication flavors available in the app.
 */
export const AUTH_FLAVORS = {
  magicLink: { projectId: MAGIC_LINK_PROJECT_ID, emailAuthMethod: "magicLink" },
  otp: { projectId: OTP_PROJECT_ID, emailAuthMethod: "otp" },
} as const;

export type AuthFlavorId = keyof typeof AUTH_FLAVORS;

export const AUTH_FLAVOR_IDS = Object.keys(AUTH_FLAVORS) as AuthFlavorId[];

/**
 * Magic link is the default because a magic-link email lands on `/verify` with
 * whatever URL the project's template produced — it can't carry `?authFlavor`.
 * So the flavor that has to work without params is this one.
 */
export const DEFAULT_AUTH_FLAVOR: AuthFlavorId = "magicLink";

/**
 * The transport a chain gets when nothing more specific is set.
 *
 * Everything routes through the ZeroDev staging RPC, keyed by project id and
 * chain — matching the shape the SDK itself builds in
 * `packages/react/src/utils/aaUtils.ts` (`/api/v3/<projectId>/chain/<chainId>`).
 * Anvil is the exception: it's a local node.
 *
 * Returns undefined when the project id is unset, which leaves `http()` to fall
 * back to viem's public RPC for the chain rather than building a broken URL.
 */
export function defaultTransportUrl(
  chainId: number,
  projectId: string | undefined,
): string | undefined {
  if (chainId === anvil.id) return ANVIL_RPC_URL;
  if (!projectId) return undefined;

  return `${ZERODEV_STAGING_RPC_BASE}/${projectId}/chain/${chainId}`;
}

