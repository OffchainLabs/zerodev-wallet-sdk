import type { IconName } from '@zerodev/react-ui'
import type { TxHistoryStatus } from './components/TxHistoryItem'

/**
 * One row of the history feed, presentation-ready: display strings are
 * pre-built and only `timestamp` is raw (day grouping is a relationship
 * with "now", so it can't be pre-formatted). Produced from the data-api
 * activity feed via `toTxHistoryEntries`.
 */
export interface TxHistoryEntry {
  /** Stable key — backend id, or `${txHash}-${logIndex}` when derived. */
  id: string
  /** Leading glyph for the activity kind. */
  icon: IconName
  /** Row title, e.g. `"Swapped ETH → USD₮0"`. */
  title: string
  /** Trailing amount/outcome, e.g. `"2,343 ETH"`. */
  value: string
  /** Chain the activity ran on (source side for cross-chain rows). */
  chainName: string
  chainIconUrl?: string
  /** Destination chain — cross-chain rows only. */
  destChainName?: string
  destChainIconUrl?: string
  status: TxHistoryStatus
  /** Unix epoch milliseconds — drives sorting and day grouping. */
  timestamp: number
}

// ---- Activity-feed input (mirrors the zerodev-data-api v1 contract) ----
// Only the fields the mapper reads; the server strips everything else
// through its zod serializer.

export interface HistoryQuantity {
  /** Lossy float — display only, never conversion math. */
  float: number
  /** Exact human-scale decimal string. */
  numeric: string
}

export interface HistoryToken {
  symbol: string
  chainId: number
  imageUri?: string
}

export interface HistoryTransaction {
  id: string
  /** data-api operation type; unknown values fall back to a generic row. */
  operation: string
  status: 'pending' | 'success' | 'failed'
  chainId: number
  token?: HistoryToken
  quantity?: HistoryQuantity
  /** Bought side — swaps only. */
  destToken?: HistoryToken
  destQuantity?: HistoryQuantity
  nft?: { tokenId: string; name: string; imageUri?: string }
  /** Unix SECONDS (data-api convention) — the mapper converts to ms. */
  timestamp: number
  txHash?: `0x${string}`
}

/** Items that failed the server's full ingress validation are served inline
 * as minimal placeholders; the mapper drops them. */
export interface UnparsedHistoryItem {
  kind: 'unparsed'
  txHash: string
}

export type HistoryFeedItem = HistoryTransaction | UnparsedHistoryItem
