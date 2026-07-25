import {
  Badge,
  ListItem,
  ListItemChevron,
  ListItemIcon,
  PoweredBy,
  Text,
} from '@zerodev/react-ui'
import { useConnect, useConnectors } from 'wagmi'
import { useAuth } from '../hooks/useAuth'
import { matchesWallet, WALLET_GUIDE } from '../walletGuide'

export function WalletSelection() {
  const { goToStep } = useAuth()
  const { mutate: connect, isPending } = useConnect()
  const connectors = useConnectors()

  // Our own connector is the embedded wallet, and walletConnect-type
  // connectors are the mobile transport rather than a wallet — neither
  // belongs in the list.
  const walletConnectors = connectors.filter(
    (c) => c.id !== 'zerodev-wallet' && c.type !== 'walletConnect',
  )

  // Live connectors we have no guide entry for still get a row — nothing
  // installed is ever hidden.
  const unmatchedConnectors = walletConnectors.filter(
    (c) => !WALLET_GUIDE.some((wallet) => matchesWallet(c, wallet)),
  )

  // A 6963 announcement (connector id === rdns) proves a live extension; a
  // configured SDK connector merely claims the rdns and exists regardless of
  // installation — only announcements earn the INSTALLED badge.
  const isAnnounced = (rdns: string | undefined) =>
    !!rdns && walletConnectors.some((c) => c.id === rdns)

  // Installed wallets float to the top, guide order within each group.
  const sortedWallets = [
    ...WALLET_GUIDE.filter((w) => isAnnounced(w.rdns)),
    ...WALLET_GUIDE.filter((w) => !isAnnounced(w.rdns)),
  ]

  const handleSelect = (connector: (typeof connectors)[number]) => {
    connect({ connector }, { onSuccess: () => goToStep(null) })
  }

  return (
    <>
      <div className="zd:flex-1 zd:flex zd:flex-col zd:gap-8 zd:justify-center">
        <Text className="zd:text-h2 zd:text-center">Select your wallet</Text>

        <div className="zd:flex zd:flex-col zd:gap-2">
          {sortedWallets.map((wallet) => {
            const installed = walletConnectors.find((c) =>
              matchesWallet(c, wallet),
            )
            const shared = {
              title: wallet.name,
              icon: <img src={wallet.icon} alt="" className="zd:w-6 zd:h-6" />,
              trailing: <ListItemChevron />,
            }
            // Claimed by a connector → connect it; otherwise the row is a
            // real download link.
            return installed ? (
              <ListItem
                key={wallet.id}
                {...shared}
                {...(isAnnounced(wallet.rdns) && {
                  subtitle: <Badge text="INSTALLED" />,
                })}
                disabled={isPending}
                onClick={() => handleSelect(installed)}
              />
            ) : (
              <ListItem key={wallet.id} {...shared} asChild>
                {/* biome-ignore lint/a11y/useAnchorContent: the row layout (incl. the title text) is injected into the anchor via Slot */}
                <a
                  href={wallet.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </ListItem>
            )
          })}
          {unmatchedConnectors.map((connector) => (
            <ListItem
              key={connector.uid}
              title={connector.name}
              icon={
                connector.icon ? (
                  <img src={connector.icon} alt="" className="zd:w-6 zd:h-6" />
                ) : (
                  <ListItemIcon name="walletOutline" />
                )
              }
              {...(connector.type === 'injected' && {
                subtitle: <Badge text="INSTALLED" />,
              })}
              trailing={<ListItemChevron />}
              disabled={isPending}
              onClick={() => handleSelect(connector)}
            />
          ))}
        </div>
      </div>

      <PoweredBy className="zd:self-center zd:pt-4 zd:pb-6" />
    </>
  )
}
