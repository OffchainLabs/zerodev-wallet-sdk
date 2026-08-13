/**
 * Browser E2E test for the OTP authentication flow.
 *
 * Drives the QA lab UI end to end: create a temp email, request an OTP against
 * the OTP-configured project, read the code out of the email, submit it, and
 * assert the lab renders authenticated with a wallet address.
 */

import { test } from '@playwright/test'
import { createNewAccount, ping } from '../helpers/temp-email.js'
import {
  loginWithOtp,
  logoutAndExpectLoginSurface,
} from '../helpers/ui-login.js'

test.describe('OTP Flow', () => {
  test.beforeEach(async () => {
    try {
      await ping()
    } catch {
      test.skip(true, 'Email service unavailable')
    }
  })

  test('should complete OTP login through the UI', async ({ page }) => {
    const emailAccount = await createNewAccount()
    await loginWithOtp(page, emailAccount.address, emailAccount.authToken)
  })

  test('should verify OTP for an existing wallet after logout', async ({
    page,
  }) => {
    const emailAccount = await createNewAccount()
    await loginWithOtp(page, emailAccount.address, emailAccount.authToken)

    await logoutAndExpectLoginSurface(page)

    await loginWithOtp(page, emailAccount.address, emailAccount.authToken)
  })
})
