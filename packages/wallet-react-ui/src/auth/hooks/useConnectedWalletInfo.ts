import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import {
  matchesWallet,
  WALLET_GUIDE,
  type WalletGuideEntry,
  type WalletId,
} from '../walletGuide'

/** How the active connection reaches the wallet. */
export type ConnectedWalletSource =
  | 'injected'
  | 'walletconnect'
  | 'embedded'
  | 'other'

export type ConnectedWalletInfo = {
  /** Human-readable wallet name ('MetaMask', 'Trust Wallet', …). */
  name?: string | undefined
  /** Wallet icon URL or data: URI, when one is known. */
  icon?: string | undefined
  /** Guide id when the wallet matches the kit's wallet guide. */
  walletId?: WalletId | undefined
  source: ConnectedWalletSource
}

/** The slice of `@walletconnect/ethereum-provider` this hook reads. */
type WcPeerProvider = {
  session?: {
    peer?: {
      metadata?: { name?: string; icons?: readonly string[] }
    }
  }
}

/**
 * Guide entry for a WalletConnect peer, matched by name. Peers report their
 * own branding ('MetaMask Wallet', 'Trust Wallet', …), so match by
 * case-insensitive containment in either direction against the guide names.
 */
function guideEntryForPeerName(name: string): WalletGuideEntry | undefined {
  const peer = name.toLowerCase()
  return WALLET_GUIDE.find((wallet) => {
    const guide = wallet.name.toLowerCase()
    return peer.includes(guide) || guide.includes(peer)
  })
}

function guideEntryForConnector(connector: {
  id: string
  name?: string
  type?: string
  rdns?: string | readonly string[] | undefined
}): WalletGuideEntry | undefined {
  return WALLET_GUIDE.find((wallet) => matchesWallet(connector, wallet))
}

/**
 * Identity of the wallet behind the active wagmi connection — the kit's
 * equivalent of AppKit's `useWalletInfo`, for wallet-specific handling and
 * analytics attribution.
 *
 * wagmi's `useAccount().connector` already names injected wallets, but a
 * WalletConnect connection only reports "WalletConnect" — the actual wallet
 * on the other end (Trust, Rainbow, … on a phone) is in the session's peer
 * metadata, which this hook reads from the provider. Returns `undefined`
 * while disconnected, and resolves the WalletConnect case asynchronously
 * (briefly `name: undefined` after connect/reload).
 */
export function useConnectedWalletInfo(): ConnectedWalletInfo | undefined {
  const { connector, isConnected } = useAccount()
  const [peerMetadata, setPeerMetadata] = useState<
    { name?: string; icons?: readonly string[] } | undefined
  >(undefined)

  const isWalletConnect = !!connector && connector.type === 'walletConnect'

  useEffect(() => {
    if (!connector || !isWalletConnect) {
      setPeerMetadata(undefined)
      return
    }
    let cancelled = false
    connector
      .getProvider()
      .then((provider) => {
        if (cancelled) return
        const metadata = (provider as WcPeerProvider).session?.peer?.metadata
        setPeerMetadata(metadata)
      })
      .catch(() => {
        // Provider unavailable (torn down mid-flight) — stay unresolved.
      })
    return () => {
      cancelled = true
    }
  }, [connector, isWalletConnect])

  if (!isConnected || !connector) return undefined

  if (connector.id === 'zerodev-wallet') {
    return {
      name: connector.name,
      icon: connector.icon,
      source: 'embedded',
    }
  }

  if (isWalletConnect) {
    const entry = peerMetadata?.name
      ? guideEntryForPeerName(peerMetadata.name)
      : undefined
    return {
      name: peerMetadata?.name ?? undefined,
      icon: peerMetadata?.icons?.[0] ?? entry?.icon,
      walletId: entry?.id as WalletId | undefined,
      // Identity is about the session, so a raw walletConnect() connector
      // resolves here too — unlike pairing, which is kit-connector-only.
      source: 'walletconnect',
    }
  }

  const entry = guideEntryForConnector(connector)

  return {
    name: connector.name,
    icon: connector.icon ?? entry?.icon,
    walletId: entry?.id as WalletId | undefined,
    source: connector.type === 'injected' ? 'injected' : 'other',
  }
}
