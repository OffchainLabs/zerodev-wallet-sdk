/**
 * Shared helper: retries KMS calls the backend rate-limits.
 *
 * The staging KMS caps requests per project on the OTP auth routes
 * (`/auth/init/otp`, `/auth/login/otp`). Integration files run serially
 * (`fileParallelism: false`) but back-to-back, and each test registers and
 * logs in a fresh user, so a full-suite run trips the limit even though no
 * single test is abusive. The window is short — the backend's own message
 * says "try again in a few seconds" — so a bounded backoff recovers without
 * masking real failures: anything that isn't a 429 rethrows immediately.
 *
 * Mirrors the mail.tm 429 handling in `temp-email-mailtm.ts`.
 */

/** Total tries, not retries: 1 initial call + 3 backed-off retries. */
export const RATE_LIMIT_ATTEMPTS = 4

/**
 * Backoff is 3s, 6s, 12s (21s worst case). Kept well inside the 120s
 * `testTimeout` so it can stack on top of a full register + email-poll +
 * login cycle without turning a rate limit into a timeout.
 */
const BASE_DELAY_MS = 3_000

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms))

/** `RestRequestError` carries the HTTP status; other transports may not. */
function isRateLimited(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { status?: number }).status === 429
  )
}

function logRetry(label: string, attempt: number, delayMs: number): void {
  console.warn(
    `[rate-limit] ${label} hit 429, retrying in ${delayMs}ms (attempt ${attempt + 2}/${RATE_LIMIT_ATTEMPTS})`,
  )
}

/**
 * Runs `fn`, retrying only when it throws a 429.
 *
 * @param label - Call name used in the retry log line.
 */
export async function withRateLimitRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRateLimited(err) || attempt >= RATE_LIMIT_ATTEMPTS - 1) throw err
      const delayMs = BASE_DELAY_MS * 2 ** attempt
      logRetry(label, attempt, delayMs)
      await sleep(delayMs)
    }
  }
}

/**
 * `fetch` for tests that assert on the raw response instead of going through
 * the SDK client. Returns the first non-429 response with its body unread, so
 * callers still own `res.ok` / `res.json()`. A 429 that outlives the retries
 * is returned as-is rather than thrown, keeping the caller's assertions in
 * charge of the failure message.
 */
export async function fetchWithRateLimitRetry(
  label: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 429 || attempt >= RATE_LIMIT_ATTEMPTS - 1) return res
    const delayMs = BASE_DELAY_MS * 2 ** attempt
    logRetry(label, attempt, delayMs)
    await sleep(delayMs)
  }
}
