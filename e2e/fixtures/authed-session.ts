import { type BrowserContext, test as base, type Page } from '@playwright/test'
import { createNewAccount } from '../helpers/temp-email.js'
import { loginWithMagicLink } from '../helpers/ui-login.js'

/** How long to wait for a reused session to render the lab before re-logging in. */
const SESSION_PROBE_TIMEOUT_MS = 20_000

const isLabReady = (page: Page): Promise<boolean> =>
  page
    .getByTestId('wallet-strip')
    .waitFor({ state: 'visible', timeout: SESSION_PROBE_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false)

async function login(page: Page): Promise<void> {
  const account = await createNewAccount()
  await loginWithMagicLink(page, account.address, account.authToken)
}

/**
 * Logs in once per worker and reuses the session.
 */
export const test = base.extend<
  { authedPage: Page },
  { authedContext: BrowserContext }
>({
  authedContext: [
    async ({ browser }, use, workerInfo) => {
      // `browser.newContext()` doesn't inherit the project's `use` options, so
      // baseURL and the TLS opt-in have to be passed through explicitly.
      const { baseURL, ignoreHTTPSErrors } = workerInfo.project.use
      const context = await browser.newContext({
        ...(baseURL && { baseURL }),
        ignoreHTTPSErrors: ignoreHTTPSErrors ?? false,
      })

      const page = await context.newPage()
      await login(page)
      await page.close()

      await use(context)
      await context.close()
    },
    { scope: 'worker' },
  ],

  authedPage: async ({ authedContext }, use, testInfo) => {
    const page = await authedContext.newPage()
    await page.goto('/')

    // Sessions expire and a long suite can outlive one, so fall back to a fresh
    // login rather than failing every test after it. Annotated so a green run
    // still shows the reuse broke — otherwise a real regression looks like a
    // slow pass.
    if (!(await isLabReady(page))) {
      testInfo.annotations.push({
        type: 'session',
        description: 'shared session unusable — logged in again',
      })
      await login(page)
    }

    await use(page)
    await page.close()
  },
})
