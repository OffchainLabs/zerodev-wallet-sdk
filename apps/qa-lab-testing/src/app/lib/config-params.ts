import type { Chain } from "viem";
import {
  ANVIL_RPC_URL,
  CHAIN_CATALOG,
  DEFAULT_AUTH_METHODS,
  DEFAULT_EMAIL_AUTH_METHOD,
  envTransportUrl,
  RPC_URLS,
  SUPPORTED_CHAINS,
} from "./wallet-config";

/**
 * URL query params are the ONLY override channel for the wallet config.
 *
 * Nothing is persisted — no localStorage, no cookies. That is deliberate:
 * a persisted bad value would survive reloads and could white-screen the app
 * including the page you'd use to undo it, whereas a bad URL is fixed by
 * editing the URL. It also means no state leaks between Playwright tests.
 *
 * The other reason for the URL specifically: query params travel in the
 * request, so the server resolves exactly what the client resolves. localStorage
 * is invisible to the server, which would guarantee a hydration mismatch on any
 * chain-derived UI.
 */

export const AUTH_METHODS = ["email", "google", "passkey"] as const;
export type AuthMethodId = (typeof AUTH_METHODS)[number];

export const EMAIL_AUTH_METHODS = ["otp", "magicLink"] as const;
export type EmailAuthMethodId = (typeof EMAIL_AUTH_METHODS)[number];

export { CHAIN_CATALOG } from "./wallet-config";

/** Where a chain's transport URL came from, for the diagnostics page. */
export type TransportSource = "param" | "env" | "default" | "local" | "chain";

export const PARAM = {
  kms: "kms",
  aaHost: "aaHost",
  chains: "chains",
  authMethods: "authMethods",
  emailAuth: "emailAuth",
  /** Per-chain transport, e.g. `rpc.421614`. */
  rpcPrefix: "rpc.",
} as const;

/** Every param this module owns; used to carry config across navigation. */
export const isConfigParam = (key: string) =>
  key === PARAM.kms ||
  key === PARAM.aaHost ||
  key === PARAM.chains ||
  key === PARAM.authMethods ||
  key === PARAM.emailAuth ||
  key.startsWith(PARAM.rpcPrefix);

export interface ResolvedWalletConfig {
  kmsProxyBaseUrl: string | undefined;
  aaHost: string | undefined;
  chains: readonly [Chain, ...Chain[]];
  rpcUrls: Record<number, string | undefined>;
  /** Provenance per chain, so `/environment` can show where a transport came from. */
  rpcSources: Record<number, TransportSource>;
  authMethods: AuthMethodId[];
  emailAuthMethod: EmailAuthMethodId;
  /** Params that were present and applied — drives the "overridden" badge. */
  applied: string[];
  /** Params that were present but rejected. Never fail silently. */
  warnings: string[];
}

const DEFAULTS = {
  kms: process.env.NEXT_PUBLIC_KMS_PROXY_BASE_URL,
  aaHost: process.env.NEXT_PUBLIC_ZERODEV_AA_HOST,
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * Resolves the effective wallet config from query params, falling back to the
 * values in `wallet-config.ts` for anything absent or invalid.
 *
 * Validation lives here rather than only in the builder form because URLs are
 * hand-written and hand-edited — a spec with a typo'd param would otherwise run
 * against defaults while appearing to test an override.
 */
export function resolveWalletConfig(
  params?: URLSearchParams | null,
): ResolvedWalletConfig {
  const applied: string[] = [];
  const warnings: string[] = [];
  const get = (key: string) => params?.get(key)?.trim() || undefined;

  const readUrl = (key: string, fallback: string | undefined) => {
    const raw = get(key);
    if (raw === undefined) return fallback;
    if (!isHttpUrl(raw)) {
      warnings.push(`${key}: "${raw}" is not an http(s) URL — using default.`);
      return fallback;
    }
    applied.push(key);
    return raw;
  };

  const kmsProxyBaseUrl = readUrl(PARAM.kms, DEFAULTS.kms);
  const aaHost = readUrl(PARAM.aaHost, DEFAULTS.aaHost);

  // Chains. wagmi types this as a non-empty tuple, and an empty selection would
  // leave nothing to connect to, so an empty or fully-invalid list falls back.
  let chains: readonly [Chain, ...Chain[]] = SUPPORTED_CHAINS;
  const rawChains = get(PARAM.chains);
  if (rawChains !== undefined) {
    const ids = splitCsv(rawChains);
    const picked: Chain[] = [];
    for (const id of ids) {
      const chain = CHAIN_CATALOG.find((c) => String(c.id) === id);
      if (chain) picked.push(chain);
      else warnings.push(`${PARAM.chains}: unknown chain id "${id}" — ignored.`);
    }
    if (picked.length > 0) {
      chains = picked as unknown as [Chain, ...Chain[]];
      applied.push(PARAM.chains);
    } else {
      warnings.push(`${PARAM.chains}: no valid chains — using defaults.`);
    }
  }

  // Transports, one lookup per selected chain. Precedence: URL param, then the
  // chain's env var, then the ZeroDev staging RPC (localhost for Anvil). Only
  // if all three are absent does `http(undefined)` fall back to viem's public
  // RPC for the chain.
  const rpcUrls: Record<number, string | undefined> = {};
  const rpcSources: Record<number, TransportSource> = {};

  const fallbackTransport = (chainId: number) => {
    const url = envTransportUrl(chainId);
    rpcUrls[chainId] = url;

    if (RPC_URLS[chainId]) rpcSources[chainId] = "env";
    // Anvil is a local node, not the hosted RPC — labelling it "zerodev
    // staging" would be actively misleading when debugging a local stack.
    else if (url === ANVIL_RPC_URL) rpcSources[chainId] = "local";
    else if (url) rpcSources[chainId] = "default";
    else rpcSources[chainId] = "chain";
  };

  for (const chain of chains) {
    const key = `${PARAM.rpcPrefix}${chain.id}`;
    const raw = get(key);
    if (raw === undefined) {
      fallbackTransport(chain.id);
      continue;
    }
    if (!isHttpUrl(raw)) {
      warnings.push(`${key}: "${raw}" is not an http(s) URL — using default.`);
      fallbackTransport(chain.id);
      continue;
    }
    rpcUrls[chain.id] = raw;
    rpcSources[chain.id] = "param";
    applied.push(key);
  }

  // An rpc.* for a chain that isn't selected is almost always a mistake.
  params?.forEach((_value, key) => {
    if (!key.startsWith(PARAM.rpcPrefix)) return;
    const id = key.slice(PARAM.rpcPrefix.length);
    if (!chains.some((chain) => String(chain.id) === id)) {
      warnings.push(`${key}: chain ${id} is not selected — ignored.`);
    }
  });

  // Auth methods. Empty means no way to sign in, so it falls back too.
  let authMethods: AuthMethodId[] = [...DEFAULT_AUTH_METHODS];
  const rawAuth = get(PARAM.authMethods);
  if (rawAuth !== undefined) {
    const picked: AuthMethodId[] = [];
    for (const value of splitCsv(rawAuth)) {
      if ((AUTH_METHODS as readonly string[]).includes(value)) {
        picked.push(value as AuthMethodId);
      } else {
        warnings.push(
          `${PARAM.authMethods}: unknown method "${value}" — ignored.`,
        );
      }
    }
    if (picked.length > 0) {
      authMethods = picked;
      applied.push(PARAM.authMethods);
    } else {
      warnings.push(
        `${PARAM.authMethods}: no valid methods — using defaults.`,
      );
    }
  }

  let emailAuthMethod: EmailAuthMethodId = DEFAULT_EMAIL_AUTH_METHOD;
  const rawEmailAuth = get(PARAM.emailAuth);
  if (rawEmailAuth !== undefined) {
    if ((EMAIL_AUTH_METHODS as readonly string[]).includes(rawEmailAuth)) {
      emailAuthMethod = rawEmailAuth as EmailAuthMethodId;
      applied.push(PARAM.emailAuth);
    } else {
      warnings.push(
        `${PARAM.emailAuth}: "${rawEmailAuth}" must be one of ${EMAIL_AUTH_METHODS.join(" | ")} — using default.`,
      );
    }
  }

  return {
    kmsProxyBaseUrl,
    aaHost,
    chains,
    rpcUrls,
    rpcSources,
    authMethods,
    emailAuthMethod,
    applied,
    warnings,
  };
}

/**
 * Keeps only the config params from a query string. Used to carry the active
 * config across in-app navigation — a link that drops these silently reverts to
 * defaults, which also logs the user out.
 */
export function pickConfigParams(
  params?: URLSearchParams | null,
): URLSearchParams {
  const picked = new URLSearchParams();
  params?.forEach((value, key) => {
    if (isConfigParam(key)) picked.append(key, value);
  });
  return picked;
}

/** `?a=b` or `""` — safe to append to any href. */
export function configQuerySuffix(params?: URLSearchParams | null): string {
  const query = pickConfigParams(params).toString();
  return query ? `?${query}` : "";
}

/** Appends the active config to an internal href. */
export function withConfig(
  href: string,
  params?: URLSearchParams | null,
): string {
  const suffix = configQuerySuffix(params);
  if (!suffix) return href;
  return href.includes("?") ? `${href}&${suffix.slice(1)}` : `${href}${suffix}`;
}

/**
 * Next hands server components `searchParams` as a plain record; normalise it
 * so server and client share one resolver.
 */
export function toURLSearchParams(
  record: Record<string, string | string[] | undefined> | undefined,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.append(key, value);
  }
  return params;
}

/** Builder output: only non-default values become params. */
export function serializeOverrides(overrides: {
  kms?: string;
  aaHost?: string;
  chainIds?: number[];
  rpcUrls?: Record<number, string>;
  authMethods?: AuthMethodId[];
  emailAuthMethod?: EmailAuthMethodId;
}): URLSearchParams {
  const params = new URLSearchParams();
  const defaultChainIds = SUPPORTED_CHAINS.map((chain) => chain.id);

  if (overrides.kms && overrides.kms !== DEFAULTS.kms) {
    params.set(PARAM.kms, overrides.kms);
  }
  if (overrides.aaHost && overrides.aaHost !== DEFAULTS.aaHost) {
    params.set(PARAM.aaHost, overrides.aaHost);
  }
  if (
    overrides.chainIds &&
    overrides.chainIds.join(",") !== defaultChainIds.join(",")
  ) {
    params.set(PARAM.chains, overrides.chainIds.join(","));
  }
  for (const [id, url] of Object.entries(overrides.rpcUrls ?? {})) {
    const chainId = Number(id);
    if (url && url !== envTransportUrl(chainId)) {
      params.set(`${PARAM.rpcPrefix}${chainId}`, url);
    }
  }
  if (
    overrides.authMethods &&
    overrides.authMethods.join(",") !== DEFAULT_AUTH_METHODS.join(",")
  ) {
    params.set(PARAM.authMethods, overrides.authMethods.join(","));
  }
  if (
    overrides.emailAuthMethod &&
    overrides.emailAuthMethod !== DEFAULT_EMAIL_AUTH_METHOD
  ) {
    params.set(PARAM.emailAuth, overrides.emailAuthMethod);
  }

  return params;
}
