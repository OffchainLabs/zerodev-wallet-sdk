import type { Meta, StoryObj } from '@storybook/react-vite'

import { TxHistoryItem } from '.'

const ARB_ICON =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png'
const BASE_ICON =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png'

const meta = {
  title: 'TxHistory/TxHistoryItem',
  component: TxHistoryItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['Pending', 'Success', 'Failed'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 352 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TxHistoryItem>

export default meta
type Story = StoryObj<typeof meta>

export const CrossChainSwap: Story = {
  args: {
    icon: 'arrowSwapHorizontalOutline',
    title: 'Swapped ETH → USD₮0',
    value: '2,343 ETH',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    destChainName: 'Base',
    destChainIconUrl: BASE_ICON,
    status: 'Pending',
  },
}

export const FixedYield: Story = {
  args: {
    icon: 'lighting',
    title: 'Fixed Yield',
    value: '2,323 PT wstETH (25 Jan 2026)',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
  },
}

export const ReceivedNft: Story = {
  args: {
    icon: 'imageFill',
    title: 'Received NFT',
    value: 'Bored Ape Yacht Club',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
  },
}

export const LongValueTruncates: Story = {
  args: {
    icon: 'lighting',
    title: 'Collateral Used',
    value: 'Collateralization enabled for USD₮0',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    status: 'Success',
  },
}

export const Failed: Story = {
  args: {
    icon: 'arrowSwapHorizontalOutline',
    title: 'Swapped ETH → USD₮0',
    value: '2,343 ETH',
    chainName: 'Arbitrum One',
    chainIconUrl: ARB_ICON,
    destChainName: 'Base',
    destChainIconUrl: BASE_ICON,
    status: 'Failed',
  },
}
