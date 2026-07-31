'use client'

import { installMockFetch } from '@mocks/installMockFetch.js'
import { MOCKS_ENABLED } from './mockFlag'

/**
 * Installs the `fetch` patch, gated on `NEXT_PUBLIC_ENABLE_MOCKS`.
 *
 * Called synchronously from `Providers` rather than from an effect. `WagmiProvider`
 * has `reconnectOnMount`, so the connector can issue requests as soon as it
 * mounts; an effect runs *after* children mount and would lose that race,
 * leaving the first calls of a session unmocked.
 *
 * No mocks are active until something calls `setMocks` — installing only puts
 * the interceptor in place, and with no rules everything passes through. So this
 * is inert until a scenario is picked.
 */
export function installMocksIfEnabled(): void {
  if (!MOCKS_ENABLED) return
  installMockFetch()
}
