import { describe, expect, it } from 'vitest'
import type { HistoryTransaction } from '../types'
import { toTxHistoryEntries } from './toTxHistoryEntries'

const BASE: HistoryTransaction = {
  id: 'tx-1',
  operation: 'receive',
  status: 'success',
  chainId: 1,
  token: { symbol: 'ETH', chainId: 1 },
  quantity: { float: 0.000844680733, numeric: '0.000844680733319992' },
  timestamp: 1_786_670_795, // unix seconds, per the data-api contract
  txHash: '0xabc',
}

describe('toTxHistoryEntries', () => {
  it('maps a receive with title, amount, chain, and ms timestamp', () => {
    const [entry] = toTxHistoryEntries([BASE])
    expect(entry).toMatchObject({
      id: 'tx-1',
      title: 'Received ETH',
      chainName: 'Ethereum',
      status: 'Success',
      timestamp: 1_786_670_795_000,
    })
    expect(entry?.value).toContain('ETH')
  })

  it('titles swaps from both sides', () => {
    const [entry] = toTxHistoryEntries([
      {
        ...BASE,
        operation: 'swap',
        destToken: { symbol: 'USDC', chainId: 1 },
        destQuantity: { float: 1.59, numeric: '1.59' },
      },
    ])
    expect(entry?.title).toBe('Swapped ETH → USDC')
    expect(entry?.icon).toBe('arrowSwapHorizontalOutline')
    // Same-chain swap — no destination chain tag
    expect(entry?.destChainName).toBeUndefined()
  })

  it('marks cross-chain when the dest token lives on another chain', () => {
    const [entry] = toTxHistoryEntries([
      {
        ...BASE,
        operation: 'swap',
        destToken: { symbol: 'USDC', chainId: 42161 },
      },
    ])
    expect(entry?.destChainName).toBe('Arbitrum One')
  })

  it('renders NFT rows from the nft block', () => {
    const [entry] = toTxHistoryEntries([
      {
        ...BASE,
        operation: 'mint',
        token: undefined,
        quantity: undefined,
        nft: { tokenId: '42', name: 'Bored Ape #42' },
      },
    ])
    expect(entry?.title).toBe('Minted NFT')
    expect(entry?.value).toBe('Bored Ape #42')
    expect(entry?.icon).toBe('imageFill')
  })

  it('degrades gracefully on unknown operations and chains', () => {
    const [entry] = toTxHistoryEntries([
      { ...BASE, operation: 'frobnicate', chainId: 999_999 },
    ])
    expect(entry?.title).toBe('Frobnicate ETH')
    expect(entry?.icon).toBe('transaction')
    expect(entry?.chainName).toBe('Chain 999999')
  })

  it('maps pending and failed statuses to display casing', () => {
    const entries = toTxHistoryEntries([
      { ...BASE, id: 'a', status: 'pending' },
      { ...BASE, id: 'b', status: 'failed' },
    ])
    expect(entries.map((e) => e.status)).toEqual(['Pending', 'Failed'])
  })

  it('drops unparsed placeholder items', () => {
    const entries = toTxHistoryEntries([
      { kind: 'unparsed', txHash: '0xdead' },
      BASE,
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0]?.id).toBe('tx-1')
  })
})
