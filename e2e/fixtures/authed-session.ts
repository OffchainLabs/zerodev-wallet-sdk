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

  authedPage: async ({ authedContext }, use) => {
    const page = await authedContext.newPage()
    await page.goto('/')

    // Sessions expire and a long suite can outlive one. Fall back to a fresh
    // login rather than failing every test that follows.
    if (!(await isLabReady(page))) {
      console.log('Reused session was not usable — logging in again')
      await login(page)
    }

    await use(page)
    await page.close()
  },
})
