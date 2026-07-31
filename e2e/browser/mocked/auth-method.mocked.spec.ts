/**
 * Proves a mocked response reaches the UI, not just the proxy.
 *
 * Login is real (Guerrilla Mail + staging KMS); only `GET /authenticators` is
 * mocked, and mocks are registered before logging in so auth traffic passes
 * through untouched and the response is already mocked by the first read.
 *
 * The assertion is a state the app cannot reach by itself: signing in by OTP can
 * only ever label the wallet "Email", so "Google" means the mock served it.
 */
import { expect } from '@playwright/test'
import { createNewAccount, ping } from '../../helpers/temp-email.js'
import { loginWithOtp } from '../../helpers/ui-login.js'
import {
  authMethod,
  MOCK_AUTH_METHOD_LABEL,
} from '../../mocks/presets/authMethod.js'
import { test } from '../../mocks/test.js'
import { withMocks } from '../../mocks/withMocks.js'

test.describe('Mocked auth method', () => {
  test.beforeEach(async () => {
    try {
      await ping()
    } catch {
      test.skip(true, 'Email service unavailable')
    }
  })

  test('wallet strip reports the mocked provider after an OTP login', async ({
    page,
  }) => {
    await withMocks({ mocks: authMethod }, async () => {
      const emailAccount = await createNewAccount()
      await loginWithOtp(page, emailAccount.address, emailAccount.authToken)

      await expect(page.getByTestId('wallet-auth-method')).toHaveText(
        MOCK_AUTH_METHOD_LABEL,
        { timeout: 30_000 },
      )
    })
  })
})
