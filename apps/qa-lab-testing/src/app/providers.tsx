'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { WagmiProvider } from 'wagmi'
import { pickConfigParams, resolveWalletConfig } from './lib/config-params'
import { createWalletConfig } from './wagmi-config'

/**
 * One wagmi config per distinct set of config params, cached at module scope.
 */
const configCache = new Map<
  string,
  { config: ReturnType<typeof createWalletConfig>; queryClient: QueryClient }
>()

function getConfigFor(configKey: string) {
  const cached = configCache.get(configKey)
  if (cached) return cached

  const entry = {
    config: createWalletConfig(
      resolveWalletConfig(new URLSearchParams(configKey)),
    ),
    queryClient: new QueryClient(),
  }
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
