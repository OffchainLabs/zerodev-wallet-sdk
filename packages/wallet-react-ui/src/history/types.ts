import type { IconName } from '@zerodev/react-ui'
import type { TxHistoryStatus } from './components/TxHistoryItem'

/**
 * One row of the history feed, presentation-ready. This is the mock-stage
 * shape: display strings are pre-built and only `timestamp` is raw (day
 * grouping is a relationship with "now", so it can't be pre-formatted).
 * When the real activity source lands, its domain model maps into this via
 * a `toTxHistoryEntry`-style adapter rather than reshaping the components.
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
