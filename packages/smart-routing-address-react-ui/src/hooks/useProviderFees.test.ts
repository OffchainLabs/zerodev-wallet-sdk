/**
 * @vitest-environment happy-dom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { numberToHex } from 'viem'
import { base, optimism } from 'viem/chains'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EstimatedFeeData, SourceToken } from '../types'
import { useProviderFees } from './useProviderFees'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SOURCE_USDC_OPTIMISM: SourceToken = {
  tokenType: 'USDC',
  chain: optimism,
}

const FEE_DATA_USDC: EstimatedFeeData = {
  token: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
  name: 'USDC',
  decimal: 6,
  fee: numberToHex(500_000n),
  minDeposit: numberToHex(1_000_000n),
  maxDeposit: numberToHex(1_000_000_000n),
  isSponsored: false,
}

// Across returns a $0.30 total; Relay returns $0.42 → Across should win.
const ACROSS_CHEAPER = {
  totalRelayFee: { pct: '0', total: '300000' },
  relayerCapitalFee: { pct: '0', total: '100000' },
  relayerGasFee: { pct: '0', total: '100000' },
  lpFee: { pct: '0', total: '100000' },
  estimatedFillTimeSec: 15,
}

const RELAY_PRICIER = {
  fees: {
    relayer: { amountUsd: '0.42' },
    relayerGas: { amountUsd: '0.12' },
    relayerService: { amountUsd: '0.30' },
  },
  details: {
    timeEstimate: 8,
  },
}

// Same shape as ACROSS_CHEAPER but pricier ($0.60 total) so Relay wins.
const ACROSS_PRICIER = {
  ...ACROSS_CHEAPER,
  totalRelayFee: { pct: '0', total: '600000' },
}

// ---------------------------------------------------------------------------
// Fetch mock — dispatches by URL and returns fake JSON responses.
// ---------------------------------------------------------------------------

type FetchResponse = { ok: boolean; json: () => Promise<unknown> }

function mockResponse(body: unknown, ok = true): FetchResponse {
  return { ok, json: async () => body }
}

function installFetch(routes: {
  across?: FetchResponse | Error
  relay?: FetchResponse | Error
}) {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const target = url.includes('across.to') ? routes.across : routes.relay
    if (target === undefined) throw new Error(`Unmocked URL: ${url}`)
    if (target instanceof Error) throw target
    return target as unknown as Response
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

// Silence the biome-approved console.warn logs — they're expected in error /
// schema-drift paths and would noise up the test output.
let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  warnSpy.mockRestore()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useProviderFees', () => {
  it('is idle (no fetch, loading=false) when source is null', () => {
    const fetchMock = installFetch({})
    const { result } = renderHook(() =>
      useProviderFees(null, base, FEE_DATA_USDC),
    )
    expect(result.current).toEqual({ fees: null, loading: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is idle when feeData is null', () => {
    const fetchMock = installFetch({})
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, null),
    )
    expect(result.current).toEqual({ fees: null, loading: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('picks the cheaper quote by quotedTotalUsd (Across wins)', async () => {
    installFetch({
      across: mockResponse(ACROSS_CHEAPER),
      relay: mockResponse(RELAY_PRICIER),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fees?.provider).toBe('Across')
    expect(result.current.fees?.quotedTotalUsd).toBeCloseTo(0.3, 5)
  })

  it('picks Relay when it is cheaper', async () => {
    installFetch({
      across: mockResponse(ACROSS_PRICIER),
      relay: mockResponse(RELAY_PRICIER),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fees?.provider).toBe('Relay')
    expect(result.current.fees?.quotedTotalUsd).toBeCloseTo(0.42, 5)
  })

  it('falls back to the surviving provider when the other returns non-2xx', async () => {
    installFetch({
      across: mockResponse(null, false),
      relay: mockResponse(RELAY_PRICIER),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fees?.provider).toBe('Relay')
  })

  it('returns fees=null when every provider fails', async () => {
    installFetch({
      across: mockResponse(null, false),
      relay: mockResponse(null, false),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fees).toBeNull()
  })

  it('falls back gracefully when Across response fails schema validation', async () => {
    // Missing required legs — schema will reject.
    installFetch({
      across: mockResponse({ totalRelayFee: { pct: '0', total: '0' } }),
      relay: mockResponse(RELAY_PRICIER),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fees?.provider).toBe('Relay')
    // Developer signal fired — schema drift shouldn't be silent.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Across response failed schema validation'),
      expect.any(Array),
    )
  })

  it('logs and swallows non-abort fetch errors', async () => {
    installFetch({
      across: new Error('network down'),
      relay: mockResponse(RELAY_PRICIER),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fees?.provider).toBe('Relay')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Across failed'),
      expect.any(Error),
    )
  })

  it('flips loading true then false across a fetch cycle', async () => {
    installFetch({
      across: mockResponse(ACROSS_CHEAPER),
      relay: mockResponse(RELAY_PRICIER),
    })
    const { result } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    // The effect sets loading=true synchronously on the first render pass —
    // by the time renderHook returns it should already be true.
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('does not update state after the hook unmounts (abort path)', async () => {
    // Deferred responses so the effect is still in-flight at unmount time.
    let resolveAcross: (r: FetchResponse) => void = () => {}
    let resolveRelay: (r: FetchResponse) => void = () => {}
    const acrossP = new Promise<FetchResponse>((r) => {
      resolveAcross = r
    })
    const relayP = new Promise<FetchResponse>((r) => {
      resolveRelay = r
    })
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        return url.includes('across.to') ? acrossP : relayP
      }),
    )

    const { result, unmount } = renderHook(() =>
      useProviderFees(SOURCE_USDC_OPTIMISM, base, FEE_DATA_USDC),
    )
    expect(result.current.loading).toBe(true)
    unmount()
    // Resolve after unmount — the hook's controller is aborted, so state
    // should stay as it was at unmount time. No React "state update on
    // unmounted component" warning should fire either.
    resolveAcross(mockResponse(ACROSS_CHEAPER))
    resolveRelay(mockResponse(RELAY_PRICIER))
    // Give microtasks a beat to settle.
    await Promise.resolve()
    expect(result.current.loading).toBe(true)
    expect(result.current.fees).toBeNull()
  })
})
