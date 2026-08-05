import { describe, expect, it } from 'vitest'
import { evaluateIntegrationRun } from './check-integration-ran.mjs'

/**
 * The integration job used to report green when the KMS was unreachable:
 * every test hits `context.skip()` in `beforeAll`, vitest counts a fully
 * skipped file as passed, and the run exits 0. A green badge was therefore
 * equally consistent with "everything works" and "nothing ran".
 *
 * `evaluateIntegrationRun` is what restores meaning to that badge, so it is
 * itself the thing most worth testing: if it is wrong, CI lies.
 *
 * Fixtures mirror the real `--reporter=json` payload (captured from an actual
 * run against an unreachable KMS), not an assumed shape.
 */

type Status = 'passed' | 'failed' | 'skipped'

function assertion(fullName: string, status: Status) {
  return {
    ancestorTitles: [fullName.split(' ')[0]],
    fullName,
    status,
    title: fullName,
    duration: 0.74,
    failureMessages: [],
    meta: {},
    tags: [],
  }
}

function report(assertions: ReturnType<typeof assertion>[]) {
  const count = (s: Status) => assertions.filter((a) => a.status === s).length
  return {
    numTotalTestSuites: 1,
    numPassedTestSuites: 1,
    numFailedTestSuites: 0,
    numPendingTestSuites: 0,
    numTotalTests: assertions.length,
    numPassedTests: count('passed'),
    numFailedTests: count('failed'),
    numPendingTests: count('skipped'),
    numTodoTests: 0,
    snapshot: {},
    startTime: 1_700_000_000_000,
    success: count('failed') === 0,
    testResults: [
      {
        assertionResults: assertions,
        startTime: 1_700_000_000_000,
        endTime: 1_700_000_001_000,
        status: 'passed',
        message: '',
        name: '/repo/e2e/integration/otp-flow.test.ts',
      },
    ],
  }
}

describe('evaluateIntegrationRun', () => {
  it('rejects a run where every test skipped, even though vitest reported success', () => {
    const result = evaluateIntegrationRun(
      report([
        assertion('OTP login works', 'skipped'),
        assertion('OTP resend works', 'skipped'),
      ]),
    )

    // The exact case that made CI unfalsifiable.
    expect(result.ok).toBe(false)
    expect(result.executed).toBe(0)
    expect(result.skipped).toBe(2)
    expect(result.reason).toMatch(/no integration test actually ran/i)
  })

  it('accepts a run where at least one test executed against the KMS', () => {
    const result = evaluateIntegrationRun(
      report([
        assertion('OTP login works', 'passed'),
        assertion('OTP resend works', 'skipped'),
      ]),
    )

    expect(result.ok).toBe(true)
    expect(result.executed).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('counts a failed test as executed — vitest already fails the run, we must not mask it', () => {
    const result = evaluateIntegrationRun(
      report([assertion('OTP login works', 'failed')]),
    )

    // A real assertion failure means the KMS was reached. This checker exists
    // only to catch "nothing ran", so it must not add a second, confusing
    // failure reason on top of vitest's own.
    expect(result.ok).toBe(true)
    expect(result.executed).toBe(1)
  })

  it('names the skipped tests so the CI annotation is actionable', () => {
    const result = evaluateIntegrationRun(
      report([
        assertion('OTP login works', 'passed'),
        assertion('magic link round-trips', 'skipped'),
        assertion('wallet export succeeds', 'skipped'),
      ]),
    )

    expect(result.skippedTests).toEqual([
      'magic link round-trips',
      'wallet export succeeds',
    ])
  })

  it('reports no skips when the whole suite ran', () => {
    const result = evaluateIntegrationRun(
      report([
        assertion('OTP login works', 'passed'),
        assertion('magic link round-trips', 'passed'),
      ]),
    )

    expect(result.ok).toBe(true)
    expect(result.skipped).toBe(0)
    expect(result.skippedTests).toEqual([])
  })

  it('rejects a report with no test files rather than treating it as a pass', () => {
    // `vitest run` with a bad --config or a glob that matches nothing produces
    // an empty report. Silently passing here would reintroduce the same blind
    // spot through a different door.
    const result = evaluateIntegrationRun({
      ...report([]),
      testResults: [],
    })

    expect(result.ok).toBe(false)
    expect(result.executed).toBe(0)
  })

  it('rejects a malformed report instead of throwing', () => {
    const result = evaluateIntegrationRun({} as never)

    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/malformed|unreadable/i)
  })
})
