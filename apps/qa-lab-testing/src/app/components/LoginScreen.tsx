'use client'

import { ConnectWallet, useAuth } from '@zerodev/wallet-react-ui'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { AppHeader } from './AppHeader'

/**
 * Login surface for the QA lab. Unlike the signer demo's landing page this
 * doesn't navigate anywhere on success — the root route re-renders the lab in
 * place once wagmi reports `connected`.
 */
export function LoginScreen() {
  const { connect, connectors, status: connectStatus } = useConnect()
  const { isConnected, status: accountStatus } = useAccount()
  const { step: authStep } = useAuth()

  // Auth has succeeded (ConnectWallet unmounts once step hits `authenticated`) but
  // wagmi hasn't flipped `isConnected` yet. Cover that window with a loader so
  // the column doesn't sit blank before the lab swaps in.
  const isSettling = isConnected || authStep === 'authenticated'
  // wagmi failed to (re)connect — offer a manual Reconnect instead of a
  // misleading CTA.
  const showReconnect =
    !isConnected && authStep === null && connectStatus === 'error'
  // ConnectWallet renders nothing until it has a `step`, so any time we're not
  // connected and have no step yet — initial session probe, auto-connect in
  // flight, or landing back here right after logout — show the loader.
  const showLoading =
    isSettling || (!isConnected && authStep === null && !showReconnect)

  const handleReconnect = () => {
    if (connectors[0]) connect({ connector: connectors[0] })
  }

  useEffect(() => {
    if (isConnected) return
    if (
      accountStatus === 'disconnected' &&
      connectStatus === 'idle' &&
      connectors[0]
    ) {
      connect({ connector: connectors[0] })
    }
  }, [isConnected, accountStatus, connectStatus, connect, connectors])

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-4 py-8">
        {showLoading ? (
          <Loader2 className="h-10 w-10 animate-spin text-[var(--muted)]" />
        ) : showReconnect ? (
          <button
            type="button"
            onClick={handleReconnect}
            className="cursor-pointer rounded-3xl bg-[var(--ink)] px-8 py-4 text-body1 font-semibold text-white hover:bg-[#2a1c13]"
          >
            Reconnect
          </button>
        ) : (
          <>
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#9c958c]">
              Sign in to open the QA Lab
            </p>
            <ConnectWallet size="md" />
          </>
        )}
      </main>
    </div>
  )
}
