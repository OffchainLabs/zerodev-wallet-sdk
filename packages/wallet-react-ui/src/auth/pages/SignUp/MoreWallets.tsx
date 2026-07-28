import { ListItem, ListItemChevron, ListItemIcon } from '@zerodev/react-ui'
import { useState } from 'react'
import { useConnect, useConnectors } from 'wagmi'
import {
  WalletGridSheet,
  type WalletTileData,
} from '../../components/WalletGridSheet'
import { useAuth } from '../../hooks/useAuth'
import { isCancellationError } from '../../utils/isCancellationError'
import { matchesWallet, WALLET_GUIDE } from '../../walletGuide'
import { useReportPending, useSignUpContext } from './context'

/** "More wallets" row — opens the wallet grid sheet. */
export function SignUpMoreWallets({
  title = 'More wallets',
}: {
  title?: string
}) {
  const { goToStep } = useAuth()
  const { authPending, guardAgreement, setError } = useSignUpContext()
  const [open, setOpen] = useState(false)
  const connectors = useConnectors()
  const { mutate: connect, isPending } = useConnect()
  useReportPending(isPending)

  // Our own connector is the embedded wallet, and walletConnect-type
  // connectors are the mobile transport rather than a wallet — neither
  // belongs in the grid.
  const walletConnectors = connectors.filter(
    (c) => c.id !== 'zerodev-wallet' && c.type !== 'walletConnect',
  )

  // A 6963 announcement (connector id === rdns) proves a live extension; a
  // configured SDK connector merely claims the rdns and exists regardless of
  // installation — only announcements earn the INSTALLED badge.
  const isAnnounced = (rdns: string | undefined) =>
    !!rdns && walletConnectors.some((c) => c.id === rdns)

  const startConnect = (connector: (typeof connectors)[number]) => {
    setOpen(false)
    setError(null)
    connect(
      { connector },
      {
        // The external wallet is now the active wagmi connection — the
        // embedded-wallet flow is done, so close it.
        onSuccess: () => goToStep(null),
        onError: (err) => {
          if (!isCancellationError(err)) {
            setError(err instanceof Error ? err.message : String(err))
          }
        },
      },
    )
  }

  // Claimed by a connector → connect it; otherwise the tile opens the
  // vendor download page.
  const guideTiles: WalletTileData[] = WALLET_GUIDE.map((wallet) => {
    const installed = walletConnectors.find((c) => matchesWallet(c, wallet))
    return {
      key: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      installed: isAnnounced(wallet.rdns),
      onSelect: () => {
        if (installed) {
          startConnect(installed)
          return
        }
        setOpen(false)
        window.open(wallet.downloadUrl, '_blank', 'noopener,noreferrer')
      },
    }
  })

  // Live connectors we have no guide entry for still get a tile — nothing
  // installed is ever hidden.
  const connectorTiles: WalletTileData[] = walletConnectors
    .filter((c) => !WALLET_GUIDE.some((wallet) => matchesWallet(c, wallet)))
    .map((connector) => ({
      key: connector.uid,
      name: connector.name,
      icon: connector.icon,
      installed: connector.type === 'injected',
      onSelect: () => startConnect(connector),
    }))

  const handleClick = () => {
    if (authPending) return
    if (!guardAgreement()) return
    setOpen(true)
  }

  return (
    <>
      <ListItem
        icon={<ListItemIcon name="walletOutline" />}
        title={title}
        trailing={<ListItemChevron />}
        disabled={authPending}
        onClick={handleClick}
      />
      <WalletGridSheet
        open={open}
        onOpenChange={setOpen}
        tiles={[...guideTiles, ...connectorTiles]}
      />
    </>
  )
}
