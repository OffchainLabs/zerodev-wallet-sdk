'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { WagmiProvider } from 'wagmi'
import { installMocksIfEnabled } from './components/mocks/installMocks'
import { pickConfigParams, resolveWalletConfig } from './lib/config-params'
import { createWalletConfig } from './wagmi-config'

/**
 * Builds the wagmi config from the request's query params.
 *
 * `useSearchParams` rather than reading `window.location` at module scope: the
 * params are part of the request, so with dynamic rendering (forced in the root
 * layout) this hook returns the same values during SSR and on the client. Both
 * passes therefore build an identical config, which is what keeps chain-derived
 * UI from mismatching on hydration.
 *
 * Everything derives from `configKey` — the serialised config params — so an
 * unrelated param (say `?probe=1`) doesn't tear down the wallet.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Synchronous, before the config below builds the connector: `reconnectOnMount`
  // means it can start requesting the moment WagmiProvider mounts, which is
  // earlier than any effect would run. No-op unless NEXT_PUBLIC_ENABLE_MOCKS=1.
  installMocksIfEnabled()

  const searchParams = useSearchParams()
  const configKey = pickConfigParams(searchParams).toString()

  // Built together on purpose: a new config means a new connector and a fresh
  // session, so cached queries from the previous one are meaningless — a
  // different chain set, possibly a different backend entirely.
  const { config, queryClient } = useMemo(
    () => ({
      config: createWalletConfig(
        resolveWalletConfig(new URLSearchParams(configKey)),
      ),
      queryClient: new QueryClient(),
    }),
    [configKey],
  )

  return (
    // `key` remounts the provider if config params ever change client-side.
    // Navigation carries config forward (see ConfigLink) so this shouldn't fire
    // in normal use; when it does, remounting is the correct response.
    <WagmiProvider key={configKey} config={config} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
