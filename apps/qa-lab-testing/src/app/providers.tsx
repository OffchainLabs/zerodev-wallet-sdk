'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { WagmiProvider } from 'wagmi'
import { pickConfigParams, resolveWalletConfig } from './lib/config-params'
import { createWalletConfig } from './wagmi-config'

type ConfigEntry = {
  config: ReturnType<typeof createWalletConfig>
  queryClient: QueryClient
}

/**
 * One wagmi config per set of config params, so Strict Mode's double mount
 * reuses the connector instead of orphaning it.
 *
 * Browser only: module scope on the server is per-process, so caching there
 * would share a config and QueryClient across all requests and never evict.
 */
const configCache = new Map<string, ConfigEntry>()

function buildConfigFor(configKey: string): ConfigEntry {
  return {
    config: createWalletConfig(
      resolveWalletConfig(new URLSearchParams(configKey)),
    ),
    // Tied to the config: a different connector means a different session, so
    // the previous cache is meaningless.
    queryClient: new QueryClient(),
  }
}

function getConfigFor(configKey: string): ConfigEntry {
  if (typeof window === 'undefined') return buildConfigFor(configKey)

  const cached = configCache.get(configKey)
  if (cached) return cached

  const entry = buildConfigFor(configKey)
  configCache.set(configKey, entry)
  return entry
}

/**
 * Builds the wagmi config from the request's query params.
 *
 * `useSearchParams` rather than reading `window.location` at module scope: the
 * params are part of the request, so with dynamic rendering (forced in the root
 * layout) this hook returns the same values during SSR and on the client. Both
 * passes therefore build an identical config, which is what keeps chain-derived
 * UI from mismatching on hydration.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const configKey = pickConfigParams(searchParams).toString()
  const { config, queryClient } = getConfigFor(configKey)

  return (
    // `key` remounts the provider if config params ever change client-side.
    // Navigation carries config forward (see ConfigLink) so this shouldn't fire
    // in normal use; when it does, remounting is the correct response.
    <WagmiProvider key={configKey} config={config} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
