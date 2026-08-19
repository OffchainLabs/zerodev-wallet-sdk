import type { TxHistoryEntry } from './types'

const ARB_ICON =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png'
const BASE_ICON =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png'

const HOUR = 60 * 60 * 1000

/**
 * Placeholder feed mirroring the Figma history screen (`15873:58582`) until
 * the real activity source lands. Timestamps are relative to module load:
 * a "Today" section and an older fixed-looking section two weeks back.
 */
export const MOCK_HISTORY: TxHistoryEntry[] = [
  {
    id: 'mock-1',
    icon: 'arrowSwapHorizontalOutline',
    title: 'Swapped ETH → USD₮0',
    value: '2,343 ETH',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    destChainName: 'Base',
    destChainIconUrl: BASE_ICON,
    status: 'Pending',
    timestamp: Date.now() - 1 * HOUR,
  },
  {
    id: 'mock-2',
    icon: 'arrowSwapHorizontalOutline',
    title: 'Swapped ETH → USD₮0',
    value: '2,343 ETH',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    destChainName: 'Base',
    destChainIconUrl: BASE_ICON,
    status: 'Pending',
    timestamp: Date.now() - 2 * HOUR,
  },
  {
    id: 'mock-3',
    icon: 'lighting',
    title: 'Fixed Yield',
    value: '2,323 PT wstETH (25 Jan 2026)',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
    timestamp: Date.now() - 3 * HOUR,
  },
  {
    id: 'mock-4',
    icon: 'imageFill',
    title: 'Received NFT',
    value: 'Bored Ape Yacht Club',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
    timestamp: Date.now() - 4 * HOUR,
  },
  {
    id: 'mock-5',
    icon: 'lighting',
    title: 'Collateral Used',
    value: 'Collateralization enabled for USD₮0',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
    timestamp: Date.now() - 14 * 24 * HOUR,
  },
  {
    id: 'mock-6',
    icon: 'lighting',
    title: 'Liquid Staked ETH',
    value: '2,323 PT wstETH (25 Jan 2026)',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
    timestamp: Date.now() - 14 * 24 * HOUR - 1 * HOUR,
  },
]
