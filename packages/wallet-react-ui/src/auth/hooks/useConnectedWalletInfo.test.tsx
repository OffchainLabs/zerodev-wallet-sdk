/**
 * @vitest-environment happy-dom
 */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WALLET_GUIDE } from '../walletGuide'
import { useConnectedWalletInfo } from './useConnectedWalletInfo'

afterEach(cleanup)

type MockAccount = {
  connector: unknown
  isConnected: boolean
}

const account: MockAccount = { connector: undefined, isConnected: false }
vi.mock('wagmi', () => ({
  useAccount: () => account,
}))

beforeEach(() => {
  account.connector = undefined
  account.isConnected = false
})

const metamaskGuide = WALLET_GUIDE.find((w) => w.id === 'metamask')
if (!metamaskGuide) throw new Error('guide is missing metamask')

/** Flush the getProvider() promise the hook resolves peer metadata from. */
async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

function wcConnector(metadata: unknown) {
  return {
    id: 'walletConnect',
    name: 'WalletConnect',
    type: 'walletConnect',
    getProvider: async () => ({
      session: { peer: { metadata } },
    }),
  }
}

describe('useConnectedWalletInfo', () => {
  it('returns undefined while disconnected', () => {
    const { result } = renderHook(() => useConnectedWalletInfo())
    expect(result.current).toBeUndefined()
  })

  it('identifies an announced injected wallet via the guide', () => {
    account.connector = {
      id: 'io.metamask',
      name: 'MetaMask',
      type: 'injected',
      icon: 'data:image/png;base64,announced',
    }
    account.isConnected = true

    const { result } = renderHook(() => useConnectedWalletInfo())

    expect(result.current).toEqual({
      name: 'MetaMask',
      icon: 'data:image/png;base64,announced',
      walletId: 'metamask',
      source: 'injected',
    })
  })

  it('reports the embedded connector as embedded', () => {
    account.connector = {
      id: 'zerodev-wallet',
      name: 'ZeroDev Wallet',
      type: 'injected',
      icon: undefined,
    }
    account.isConnected = true

    const { result } = renderHook(() => useConnectedWalletInfo())

    expect(result.current).toEqual({
      name: 'ZeroDev Wallet',
      icon: undefined,
      source: 'embedded',
    })
  })

  it('resolves the WalletConnect peer wallet from session metadata', async () => {
    account.connector = wcConnector({
      name: 'Trust Wallet',
      icons: ['https://trustwallet.com/icon.png'],
    })
    account.isConnected = true

    const { result } = renderHook(() => useConnectedWalletInfo())

    // Peer metadata resolves asynchronously; the transport is known upfront.
    expect(result.current).toMatchObject({ source: 'walletconnect' })
    expect(result.current?.name).toBeUndefined()

    await flush()

    expect(result.current).toEqual({
      name: 'Trust Wallet',
      icon: 'https://trustwallet.com/icon.png',
      walletId: 'trust',
      source: 'walletconnect',
    })
  })

  it('guide-matches peer names by containment in either direction', async () => {
    account.connector = wcConnector({ name: 'MetaMask Wallet', icons: [] })
    account.isConnected = true

    const { result } = renderHook(() => useConnectedWalletInfo())
    await flush()

    expect(result.current?.walletId).toBe('metamask')
    // No peer icon supplied — falls back to the guide's icon.
    expect(result.current?.icon).toBe(metamaskGuide.icon)
  })

  it('keeps unknown WalletConnect peers, without a walletId', async () => {
    account.connector = wcConnector({
      name: 'Some New Wallet',
      icons: ['https://example.com/icon.png'],
    })
    account.isConnected = true

    const { result } = renderHook(() => useConnectedWalletInfo())
    await flush()

    expect(result.current).toEqual({
      name: 'Some New Wallet',
      icon: 'https://example.com/icon.png',
      walletId: undefined,
      source: 'walletconnect',
    })
  })

  it('labels non-injected vendor connectors as other', () => {
    account.connector = {
      id: 'coinbaseWalletSDK',
      name: 'Coinbase Wallet',
      type: 'coinbaseWallet',
      icon: 'data:image/png;base64,cb',
    }
    account.isConnected = true

    const { result } = renderHook(() => useConnectedWalletInfo())

    expect(result.current).toMatchObject({
      name: 'Coinbase Wallet',
      source: 'other',
    })
  })
})
