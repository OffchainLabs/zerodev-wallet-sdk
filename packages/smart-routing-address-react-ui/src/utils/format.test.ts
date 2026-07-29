import { describe, expect, it } from 'vitest'
import {
  formatDisplayAmount,
  formatDuration,
  formatRelativeTime,
  formatSlippage,
  formatTokenAmount,
  truncateAddress,
} from './format'

describe('formatTokenAmount', () => {
  it('formats decimal string amounts', () => {
    expect(formatTokenAmount('2000000', 6)).toBe('2')
  })

  it('formats hex string amounts', () => {
    expect(formatTokenAmount('0x1e8480', 6)).toBe('2')
  })

  it('formats bigint amounts with fractions', () => {
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.5')
  })

  it('falls back to the raw value on invalid input', () => {
    expect(formatTokenAmount('not-a-number', 6)).toBe('not-a-number')
  })
})

describe('formatDisplayAmount', () => {
  it('groups thousands and drops fractions on large amounts', () => {
    // 343138.413368 with 6 decimals
    expect(formatDisplayAmount('343138413368', 6, 'down')).toBe('343,138')
  })

  it('keeps two decimals on mid-range amounts', () => {
    // 0.500103 rounds away from the user for minimums
    expect(formatDisplayAmount('500103', 6, 'up')).toBe('0.51')
    expect(formatDisplayAmount('500103', 6, 'down')).toBe('0.5')
    expect(formatDisplayAmount(1_500_000n, 6, 'down')).toBe('1.5')
  })

  it('keeps two significant digits on sub-unit amounts', () => {
    // 0.022488
    expect(formatDisplayAmount('22488', 6, 'up')).toBe('0.023')
    expect(formatDisplayAmount('22488', 6, 'down')).toBe('0.022')
  })

  it('handles zero and exact values without noise', () => {
    expect(formatDisplayAmount('0', 6, 'down')).toBe('0')
    expect(formatDisplayAmount('1000000', 6, 'up')).toBe('1')
    expect(formatDisplayAmount('0x12a05f200', 6, 'down')).toBe('5,000')
  })

  it('falls back to the raw value on invalid input', () => {
    expect(formatDisplayAmount('not-a-number', 6, 'down')).toBe('not-a-number')
  })

  describe("round: 'nearest'", () => {
    it("resolves the docstring example (249.999676 → '250')", () => {
      // 249.999676 with 6 decimals — the "you received X" case that
      // motivated the mode: reads as 250 to a human, not 249.99.
      expect(formatDisplayAmount('249999676', 6, 'nearest')).toBe('250')
      // Contrast: 'down' understates it.
      expect(formatDisplayAmount('249999676', 6, 'down')).toBe('249.99')
    })

    it('rounds sub-half fractions down and super-half fractions up', () => {
      // 1.234999 — just below the rounding boundary (123.4999 * 100).
      // nearest keeps 1.23, up rounds all the way to 1.24.
      expect(formatDisplayAmount('1234999', 6, 'nearest')).toBe('1.23')
      expect(formatDisplayAmount('1234999', 6, 'up')).toBe('1.24')
      // 1.235500 — just above the boundary.
      expect(formatDisplayAmount('1235500', 6, 'nearest')).toBe('1.24')
      expect(formatDisplayAmount('1235500', 6, 'down')).toBe('1.23')
    })

    it("rounds .5 up (JS's default half-to-even is off)", () => {
      // 1.235 — exact half at the 2-decimal precision. JS Math.round
      // rounds positive .5 towards +∞, which is what a user expects.
      expect(formatDisplayAmount('1235000', 6, 'nearest')).toBe('1.24')
    })

    it('respects sub-unit significant-digit precision', () => {
      // 0.022499 at 3-fraction precision → boundary at .5 of the 3rd
      // decimal (22.499 * 1000). nearest floors to 0.022, up ceils to
      // 0.023.
      expect(formatDisplayAmount('22499', 6, 'nearest')).toBe('0.022')
      expect(formatDisplayAmount('22499', 6, 'up')).toBe('0.023')
    })
  })
})

describe('truncateAddress', () => {
  it('truncates long addresses', () => {
    expect(truncateAddress('0x1111111111111111111111111111111111111111')).toBe(
      '0x1111…1111',
    )
  })

  it('leaves short values untouched', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234')
  })
})

describe('formatSlippage', () => {
  it('converts basis points to percent', () => {
    expect(formatSlippage(50)).toBe('0.5%')
    expect(formatSlippage(100)).toBe('1%')
    expect(formatSlippage(125)).toBe('1.25%')
  })
})

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(30)).toBe('~30 sec')
  })

  it('formats minutes', () => {
    expect(formatDuration(120)).toBe('~2 min')
  })

  it('never reports zero seconds', () => {
    expect(formatDuration(0.2)).toBe('~1 sec')
  })
})

describe('formatRelativeTime', () => {
  // Fixed reference so every table row is deterministic. Subtract the
  // desired delta (in seconds) from NOW to produce the input timestamp.
  const NOW = Date.parse('2026-06-15T12:00:00.000Z')
  const isoAgo = (deltaSec: number) =>
    new Date(NOW - deltaSec * 1000).toISOString()

  it('returns null on invalid input', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBeNull()
    expect(formatRelativeTime('', NOW)).toBeNull()
  })

  it.each([
    // Boundary: `just now` covers deltas < 30s (including negative /
    // future deltas which get clamped to 0 by `Math.max`).
    [0, 'just now'],
    [29, 'just now'],
    [-10, 'just now'],
    // Seconds — 30 through 59.
    [30, '30 s ago'],
    [59, '59 s ago'],
    // Minutes — 60s ≤ delta < 60min. `Math.round` bumps 90s to 2m.
    [60, '1 m ago'],
    [90, '2 m ago'],
    [59 * 60, '59 m ago'],
    // Hours — 60min ≤ delta < 24h.
    [60 * 60, '1 h ago'],
    [23 * 60 * 60, '23 h ago'],
    // Days — 24h ≤ delta < 30d.
    [24 * 60 * 60, '1 d ago'],
    [29 * 24 * 60 * 60, '29 d ago'],
    // Months — 30d ≤ delta < 12mo (30-day months in this bucket).
    [30 * 24 * 60 * 60, '1 mo ago'],
    [11 * 30 * 24 * 60 * 60, '11 mo ago'],
    // Years — everything beyond 12 30-day months.
    [12 * 30 * 24 * 60 * 60, '1 y ago'],
    [3 * 12 * 30 * 24 * 60 * 60, '3 y ago'],
  ])('formats delta of %i seconds as %s', (deltaSec, expected) => {
    expect(formatRelativeTime(isoAgo(deltaSec), NOW)).toBe(expected)
  })
})
