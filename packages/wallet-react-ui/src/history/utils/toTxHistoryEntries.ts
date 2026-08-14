import type {
  HistoryFeedItem,
  HistoryQuantity,
  HistoryTransaction,
  TxHistoryEntry,
} from '../types'

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'OP Mainnet',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum One',
  11155111: 'Sepolia',
  421614: 'Arbitrum Sepolia',
}

const chainName = (id: number) => CHAIN_NAMES[id] ?? `Chain ${id}`

/** Past-tense row titles per operation; fallback capitalizes the raw value
 * so operations added server-side degrade gracefully instead of breaking. */
const OPERATION_VERBS: Record<string, string> = {
  approve: 'Approved',
  bid: 'Bid on',
  burn: 'Burned',
  claim: 'Claimed',
  delegate: 'Delegated',
  deploy: 'Deployed contract',
  deposit: 'Deposited',
  execute: 'Executed',
  mint: 'Minted',
  receive: 'Received',
  revoke: 'Revoked',
  revoke_delegation: 'Revoked delegation',
  send: 'Sent',
  swap: 'Swapped',
  withdraw: 'Withdrew',
  other: 'Transaction',
}

const OPERATION_ICONS: Record<string, TxHistoryEntry['icon']> = {
  swap: 'arrowSwapHorizontalOutline',
  mint: 'imageFill',
  claim: 'lighting',
  deposit: 'lighting',
  withdraw: 'lighting',
}

function formatAmount(quantity: HistoryQuantity): string {
  return quantity.float.toLocaleString('en-US', {
    maximumSignificantDigits: 6,
  })
}

function toEntry(tx: HistoryTransaction): TxHistoryEntry {
  const verb =
    OPERATION_VERBS[tx.operation] ??
    tx.operation.charAt(0).toUpperCase() + tx.operation.slice(1)

  const title =
    tx.operation === 'swap' && tx.token && tx.destToken
      ? `Swapped ${tx.token.symbol} → ${tx.destToken.symbol}`
      : tx.nft
        ? `${verb} NFT`
        : tx.token
          ? `${verb} ${tx.token.symbol}`
          : verb

  const value = tx.nft
    ? tx.nft.name
    : tx.quantity && tx.token
      ? `${formatAmount(tx.quantity)} ${tx.token.symbol}`
      : ''

  const destChainId = tx.destToken?.chainId
  const crossChain = destChainId !== undefined && destChainId !== tx.chainId

  return {
    id: tx.id,
    icon: tx.nft
      ? 'imageFill'
      : (OPERATION_ICONS[tx.operation] ?? 'transaction'),
    title,
    value,
    chainName: chainName(tx.chainId),
    ...(crossChain && { destChainName: chainName(destChainId) }),
    status:
      tx.status === 'pending'
        ? 'Pending'
        : tx.status === 'failed'
          ? 'Failed'
          : 'Success',
    timestamp: tx.timestamp * 1000, // data-api sends unix seconds
  }
}

/**
 * Maps a data-api activity page onto the presentation-ready feed the
 * `TxHistory` widget renders. `unparsed` placeholder items (failed the
 * server's ingress validation) are dropped — a placeholder row design is an
 * open question.
 */
export function toTxHistoryEntries(items: HistoryFeedItem[]): TxHistoryEntry[] {
  return items
    .filter((item): item is HistoryTransaction => !('kind' in item))
    .map(toEntry)
}
