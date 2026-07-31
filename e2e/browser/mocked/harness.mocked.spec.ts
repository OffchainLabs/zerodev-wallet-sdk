/**
 * Smoke test for the mocking harness plumbing: the auto worker-fixture starts
 * the proxy, `withMocks` applies a preset, the proxied browser loads the app.
 *
 * Deliberately login-free, so it stays fast and tells you whether a failure in
 * `auth-method.mocked.spec.ts` is the harness or the app.
 */
import { expect } from '@playwright/test'
import { presets } from '../../mocks/presets/index.js'
import { test } from '../../mocks/test.js'
import { withMocks } from '../../mocks/withMocks.js'

test('harness applies mocks and the proxied app loads', async ({ page }) => {
  await withMocks({ mocks: presets.authMethod }, async ({ mockServer }) => {
    // Mocks (plus the passthrough fallback) are registered on the live proxy.
    expect((await mockServer.getMockedEndpoints()).length).toBeGreaterThan(0)

    await page.goto('/')
    await expect(page.getByText('Continue to your wallet')).toBeVisible()
  })
})
