import { expect, type Locator, test } from '@playwright/test'

/** A sponsored userOp on staging can take a while; the run itself settles fast. */
const TX_SETTLE_TIMEOUT_MS = 60_000

/**
 * Staging's RPC and paymaster sit behind a shared per-project rate limit, and
 * `pm_getPaymasterData` is not retried (`@zerodev/sdk` forces `retryCount: 0` on
 * the paymaster transport), so one throttled burst fails the transaction for
 * good. Matched on the server's own wording plus the status the lab now renders,
 * only to label the failure — a throttle still fails the test.
 */
const RATE_LIMITED = /rate limit|HTTP 429/i

/**
 * Waits for a tx run to reach a terminal state and asserts it succeeded.
 *
 * Waits for `success` *or* `error` rather than `success` alone: a failed run is
 * already final within seconds, so waiting only for success spends the whole
 * timeout and then reports a timeout instead of the reason. On error the run's
 * `data-error` is read back and attached as an annotation before failing, so the
 * report says whether staging throttled us or the SDK actually broke — the two
 * belong to different owners, and the bare status assertion said neither.
 */
export async function expectTxRunSucceeded(run: Locator): Promise<void> {
  await expect(run).toHaveAttribute('data-status', /^(success|error)$/, {
    timeout: TX_SETTLE_TIMEOUT_MS,
  })

  if ((await run.getAttribute('data-status')) === 'error') {
    const detail =
      (await run.getAttribute('data-error')) ?? 'no error text rendered'
    test.info().annotations.push({
      type: RATE_LIMITED.test(detail) ? 'staging-rate-limit' : 'tx-failure',
      description: detail,
    })
    throw new Error(`Transaction run failed: ${detail}`)
  }

  await expect(run.getByTestId('tx-run-hash')).toHaveAttribute(
    'data-hash',
    /^0x[0-9a-fA-F]{64}$/,
  )
}
