import { numberToHex } from 'viem'
import { describe, expect, it } from 'vitest'
import type { EstimatedFeeData } from '../types'
import {
  type AcrossSuggestedFees,
  AcrossSuggestedFeesSchema,
  buildFeeBreakdown,
  formatFeePct,
  formatFeeUsd,
  parseAcrossFees,
  parseRelayFees,
  type RelayQuote,
  RelayQuoteSchema,
} from './providerFees'

// ---------------------------------------------------------------------------
// Schema validation — the boundary between "unknown API response" and
// "typed input the parsers can trust". These tests pin the schema to the
// exact fields the parsers consume: extra keys are accepted (stripped),
// missing/wrong-typed required keys must fail.
// ---------------------------------------------------------------------------

describe('AcrossSuggestedFeesSchema', () => {
  const valid: AcrossSuggestedFees = {
    totalRelayFee: { pct: '5', total: '500000' },
    relayerCapitalFee: { pct: '2', total: '200000' },
    relayerGasFee: { pct: '1', total: '100000' },
    lpFee: { pct: '2', total: '200000' },
    estimatedFillTimeSec: 12,
  }

  it('accepts a full valid Across response', () => {
    const result = AcrossSuggestedFeesSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts a response without the optional estimatedFillTimeSec', () => {
    const { estimatedFillTimeSec: _drop, ...rest } = valid
    const result = AcrossSuggestedFeesSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it('strips unknown keys (upstream additions do not break)', () => {
    const withExtra = { ...valid, someNewField: 'ignored' }
    const result = AcrossSuggestedFeesSchema.safeParse(withExtra)
    expect(result.success).toBe(true)
    if (result.success) {
      expect('someNewField' in result.data).toBe(false)
    }
  })

  it('rejects a response missing a required leg', () => {
    const { lpFee: _drop, ...missing } = valid
    const result = AcrossSuggestedFeesSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it('rejects a leg whose pct is a number instead of a string', () => {
    const bad = { ...valid, lpFee: { pct: 2, total: '200000' } }
    const result = AcrossSuggestedFeesSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects a non-object response', () => {
    expect(AcrossSuggestedFeesSchema.safeParse(null).success).toBe(false)
    expect(AcrossSuggestedFeesSchema.safeParse('nope').success).toBe(false)
  })
})

describe('RelayQuoteSchema', () => {
  const valid: RelayQuote = {
    fees: {
      relayer: { amountUsd: '0.42' },
      relayerGas: { amountUsd: '0.12' },
      relayerService: { amountUsd: '0.30' },
      gas: { amountUsd: '0.01' },
      app: { amountUsd: '0' },
    },
    details: {
      timeEstimate: 8,
    },
  }

  it('accepts a full valid Relay quote', () => {
    expect(RelayQuoteSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts an empty object (every field is optional)', () => {
    expect(RelayQuoteSchema.safeParse({}).success).toBe(true)
  })

  it('rejects a fees.relayer with a numeric amountUsd', () => {
    const bad = { fees: { relayer: { amountUsd: 0.42 } } }
    expect(RelayQuoteSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a fees object whose entry is not an object', () => {
    const bad = { fees: { relayer: 'nope' } }
    expect(RelayQuoteSchema.safeParse(bad).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parseAcrossFees — Across returns per-leg fractions (1e18 = 100%) and
// token-denominated totals. USDC (stablecoin) inputs price into USD; ETH
// inputs skip USD entirely.
// ---------------------------------------------------------------------------

describe('parseAcrossFees', () => {
  // 5 * 1e15 → 0.5% at 4-decimal precision
  const ACROSS_USDC: AcrossSuggestedFees = {
    // 0.5% total, 500000 raw (0.5 USDC at 6 decimals)
    totalRelayFee: { pct: '5000000000000000', total: '500000' },
    // 0.2%, 200000 raw (0.2 USDC)
    relayerCapitalFee: { pct: '2000000000000000', total: '200000' },
    // Gas leg — pct doesn't matter for the breakdown, only USD
    relayerGasFee: { pct: '1000000000000000', total: '100000' },
    // 0.2%, 200000 raw
    lpFee: { pct: '2000000000000000', total: '200000' },
    estimatedFillTimeSec: 15,
  }

  it('names the provider and preserves fill time', () => {
    const result = parseAcrossFees(ACROSS_USDC, 'USDC', 6)
    expect(result.provider).toBe('Across')
    expect(result.fillTimeSec).toBe(15)
  })

  it('produces the three expected legs in order', () => {
    const result = parseAcrossFees(ACROSS_USDC, 'USDC', 6)
    expect(result.lines.map((l) => l.key)).toEqual(['capital', 'destGas', 'lp'])
    expect(result.lines.map((l) => l.kind)).toEqual(['rate', 'flat', 'rate'])
  })

  it('sums rate legs into ratePct and flat legs into flatUsd (USDC)', () => {
    const result = parseAcrossFees(ACROSS_USDC, 'USDC', 6)
    // Capital 0.2% + LP 0.2% = 0.4%
    expect(result.ratePct).toBeCloseTo(0.4, 5)
    // Only destGas is flat: 0.1 USDC → $0.10
    expect(result.flatUsd).toBeCloseTo(0.1, 5)
  })

  it('prices quotedTotalUsd from the totalRelayFee leg (USDC)', () => {
    const result = parseAcrossFees(ACROSS_USDC, 'USDC', 6)
    expect(result.quotedTotalUsd).toBeCloseTo(0.5, 5)
  })

  it('does not price non-stable tokens into USD', () => {
    const result = parseAcrossFees(ACROSS_USDC, 'ETH', 18)
    expect(result.quotedTotalUsd).toBeNull()
    expect(result.flatUsd).toBeNull()
    // ratePct is still valid — it comes from the pct field, not the total
    expect(result.ratePct).toBeCloseTo(0.4, 5)
  })

  it('yields null pct/usd when a leg carries junk numbers', () => {
    const junk: AcrossSuggestedFees = {
      ...ACROSS_USDC,
      lpFee: { pct: 'not-a-number', total: 'nope' },
    }
    const result = parseAcrossFees(junk, 'USDC', 6)
    const lp = result.lines.find((l) => l.key === 'lp')
    expect(lp?.pct).toBeNull()
    expect(lp?.usd).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// parseRelayFees — Relay quotes every leg in USD only, so every leg is
// treated as flat. Zero-value app/originGas legs are dropped.
// ---------------------------------------------------------------------------

describe('parseRelayFees', () => {
  const RELAY_FULL: RelayQuote = {
    fees: {
      relayer: { amountUsd: '0.42' },
      relayerGas: { amountUsd: '0.12' },
      relayerService: { amountUsd: '0.30' },
      gas: { amountUsd: '0.05' },
      app: { amountUsd: '0.01' },
    },
    details: {
      timeEstimate: 8,
    },
  }

  it('names the provider and extracts fill time', () => {
    const result = parseRelayFees(RELAY_FULL)
    expect(result.provider).toBe('Relay')
    expect(result.fillTimeSec).toBe(8)
  })

  it('produces the four legs in the expected order', () => {
    const result = parseRelayFees(RELAY_FULL)
    expect(result.lines.map((l) => l.key)).toEqual([
      'service',
      'destGas',
      'originGas',
      'app',
    ])
    // Every Relay leg is flat
    expect(result.lines.every((l) => l.kind === 'flat')).toBe(true)
  })

  it('quotedTotalUsd comes from the top-level relayer leg', () => {
    const result = parseRelayFees(RELAY_FULL)
    expect(result.quotedTotalUsd).toBeCloseTo(0.42, 5)
  })

  it('sums flat legs correctly', () => {
    const result = parseRelayFees(RELAY_FULL)
    // 0.30 + 0.12 + 0.05 + 0.01
    expect(result.flatUsd).toBeCloseTo(0.48, 5)
  })

  it('ratePct is always null (Relay has no rate legs)', () => {
    expect(parseRelayFees(RELAY_FULL).ratePct).toBeNull()
  })

  it('drops zero-value app + originGas legs', () => {
    const zeroed: RelayQuote = {
      fees: {
        relayer: { amountUsd: '0.10' },
        relayerService: { amountUsd: '0.10' },
        gas: { amountUsd: '0' },
        app: { amountUsd: '0' },
      },
    }
    const result = parseRelayFees(zeroed)
    expect(result.lines.map((l) => l.key)).toEqual(['service'])
  })

  it('falls back to top-level timeEstimate when details is absent', () => {
    const noDetails: RelayQuote = {
      fees: { relayer: { amountUsd: '0.10' } },
      timeEstimate: 42,
    }
    expect(parseRelayFees(noDetails).fillTimeSec).toBe(42)
  })

  it('handles an empty quote (every leg optional)', () => {
    const result = parseRelayFees({})
    expect(result.lines).toEqual([])
    expect(result.quotedTotalUsd).toBeNull()
    expect(result.flatUsd).toBeNull()
    expect(result.fillTimeSec).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildFeeBreakdown — the SRA fee is the authoritative all-in charge; the
// provider's legs are shown *as a breakdown of it*. Execution = SRA − bridge.
// ---------------------------------------------------------------------------

describe('buildFeeBreakdown', () => {
  const USDC_FEE: EstimatedFeeData = {
    token: '0x0000000000000000000000000000000000000000',
    name: 'USDC',
    decimal: 6,
    fee: numberToHex(500_000n), // 0.5 USDC
    minDeposit: numberToHex(1_000_000n),
    maxDeposit: numberToHex(100_000_000n),
    isSponsored: false,
  }

  const ETH_FEE: EstimatedFeeData = {
    ...USDC_FEE,
    name: 'ETH',
    decimal: 18,
    fee: numberToHex(20_000_000_000_000n), // 0.00002 ETH
  }

  const SPONSORED_FEE: EstimatedFeeData = { ...USDC_FEE, isSponsored: true }

  it('emits a single Execution Fee line when no provider data is passed', () => {
    const result = buildFeeBreakdown(USDC_FEE, 'USDC', null)
    expect(result.lines.map((l) => l.key)).toEqual(['execution'])
    expect(result.lines[0]?.usd).toBeCloseTo(0.5, 5)
    expect(result.provider).toBeNull()
  })

  it('sets the SRA fee as the headline quotedTotalUsd (never provider total)', () => {
    const providerFees = parseAcrossFees(
      {
        totalRelayFee: { pct: '0', total: '300000' }, // provider = $0.30
        relayerCapitalFee: { pct: '0', total: '0' },
        relayerGasFee: { pct: '0', total: '0' },
        lpFee: { pct: '0', total: '0' },
      },
      'USDC',
      6,
    )
    const result = buildFeeBreakdown(USDC_FEE, 'USDC', providerFees)
    // Headline is the SRA fee (0.50), not the provider total (0.30)
    expect(result.quotedTotalUsd).toBeCloseTo(0.5, 5)
  })

  it('derives execution as (SRA − bridge) and stacks it above provider legs', () => {
    const providerFees = parseAcrossFees(
      {
        totalRelayFee: { pct: '0', total: '300000' }, // $0.30 bridge
        relayerCapitalFee: { pct: '0', total: '100000' },
        relayerGasFee: { pct: '0', total: '100000' },
        lpFee: { pct: '0', total: '100000' },
      },
      'USDC',
      6,
    )
    const result = buildFeeBreakdown(USDC_FEE, 'USDC', providerFees)
    // execution = 0.50 − 0.30 = 0.20
    const execution = result.lines.find((l) => l.key === 'execution')
    expect(execution?.usd).toBeCloseTo(0.2, 5)
    // Execution always first, then provider legs in the order Across returned them
    expect(result.lines.map((l) => l.key)).toEqual([
      'execution',
      'capital',
      'destGas',
      'lp',
    ])
    expect(result.provider).toBe('Across')
  })

  it('clamps execution at 0 when the bridge total exceeds the SRA fee', () => {
    const providerFees = parseAcrossFees(
      {
        totalRelayFee: { pct: '0', total: '10000000' }, // $10.00, exceeds SRA
        relayerCapitalFee: { pct: '0', total: '0' },
        relayerGasFee: { pct: '0', total: '0' },
        lpFee: { pct: '0', total: '0' },
      },
      'USDC',
      6,
    )
    const result = buildFeeBreakdown(USDC_FEE, 'USDC', providerFees)
    const execution = result.lines.find((l) => l.key === 'execution')
    expect(execution?.usd).toBe(0)
  })

  it('sponsored: quotedTotalUsd=0 and every leg reads as $0 sponsored', () => {
    const result = buildFeeBreakdown(SPONSORED_FEE, 'USDC', null)
    expect(result.quotedTotalUsd).toBe(0)
    const execution = result.lines[0]
    expect(execution?.usd).toBe(0)
    expect(execution?.sponsored).toBe(true)
    expect(result.totalText).toBeNull()
  })

  it('non-stable token: no USD; falls back to a token-denominated totalText', () => {
    const result = buildFeeBreakdown(ETH_FEE, 'ETH', null)
    expect(result.quotedTotalUsd).toBeNull()
    expect(result.totalText).toContain('ETH')
    // Execution line also shows the token-unit fallback
    expect(result.lines[0]?.text).toContain('ETH')
  })
})

// ---------------------------------------------------------------------------
// Formatting helpers — small but user-visible.
// ---------------------------------------------------------------------------

describe('formatFeePct', () => {
  it('uses 3 decimals for sub-0.1% rates', () => {
    expect(formatFeePct(0.013)).toBe('0.013%')
  })

  it('uses 2 decimals for rates ≥ 0.1%', () => {
    expect(formatFeePct(0.42)).toBe('0.42%')
  })

  it('uses 2 decimals for rates ≥ 1%', () => {
    expect(formatFeePct(1.5)).toBe('1.50%')
  })
})

describe('formatFeeUsd', () => {
  it('uses 4 decimals for tiny amounts (< $0.01)', () => {
    expect(formatFeeUsd(0.0042)).toBe('$0.0042')
  })

  it('uses 2 decimals for normal amounts', () => {
    expect(formatFeeUsd(1.5)).toBe('$1.50')
  })

  it('handles zero', () => {
    expect(formatFeeUsd(0)).toBe('$0.00')
  })
})
