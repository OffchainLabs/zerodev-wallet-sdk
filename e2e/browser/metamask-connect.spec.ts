/**
 * Browser E2E for connecting the lab to a real MetaMask extension.
 *
 * Needs the lab running and `WALLET_SRP` / `WALLET_PASSWORD` set. The first
 * run downloads the pinned MetaMask build and onboards it once; every run after
 * that reuses the cached profile.
 */

import { expect } from '@playwright/test'
import { mnemonicToAccount } from 'viem/accounts'
import { test } from '../fixtures/metamask.js'
import { credentialsFromEnv } from '../helpers/wallet-credentials.js'

const LAB_TIMEOUT_MS = 90_000

/**
 * The expected Ethereum address derived from the secret recovery phrase.
 * The secret recovery phrase is deterministic and provided by the environment variable `WALLET_SRP`.
 * @returns The expected Ethereum address derived from the secret recovery phrase.
 */
const expectedAddress = () =>
  mnemonicToAccount(credentialsFromEnv().secretRecoveryPhrase).address

test.describe('Preset 2 — real MetaMask', () => {
  test.describe.configure({ timeout: 300_000 })

  test('the pinned row is badged INSTALLED once the extension is present', async ({
    page,
  }) => {
    await page.goto('/?preset=preset-2')
    await expect(page.getByText('Continue to your wallet')).toBeVisible({
      timeout: LAB_TIMEOUT_MS,
    })

    const metamaskRow = page.getByRole('button', { name: /^MetaMask/ })
    await expect(metamaskRow).toBeVisible()

    await expect(metamaskRow).toContainText('INSTALLED')

    await expect(metamaskRow).toHaveCount(1)
  })

  test('approving the request connects the announced account', async ({
    page,
    metamask,
  }) => {
    await page.goto('/?preset=preset-2')
    await expect(page.getByText('Continue to your wallet')).toBeVisible({
      timeout: LAB_TIMEOUT_MS,
    })

    await page.getByRole('button', { name: /^MetaMask/ }).click()
    await metamask.approveConnection()

    const shown = page.getByTestId('wallet-address')
    await expect(shown).toBeVisible({ timeout: LAB_TIMEOUT_MS })

    expect((await shown.innerText()).trim().toLowerCase()).toBe(
      expectedAddress().toLowerCase(),
    )
  })

  test('signs a message with the connected external wallet', async ({
    page,
    metamask,
  }) => {
    await page.goto('/?preset=preset-2')
    await expect(page.getByText('Continue to your wallet')).toBeVisible({
      timeout: LAB_TIMEOUT_MS,
    })
    await page.getByRole('button', { name: /^MetaMask/ }).click()
    await metamask.approveConnection()
    await expect(page.getByTestId('wallet-address')).toBeVisible({
      timeout: LAB_TIMEOUT_MS,
    })

    await page.getByTestId('nav-feature-tx-signing').click()
    await expect(page.getByTestId('area-signing')).toBeVisible()

    await page
      .getByTestId('case-sign-message-presets')
      .getByTestId('sign-message-submit')
      .click()

    await metamask.approveSignature()

    const run = page.getByTestId('sign-run-1')
    await expect(run).toHaveAttribute('data-status', 'success', {
      timeout: LAB_TIMEOUT_MS,
    })

    await expect(run).toHaveAttribute('data-verify', 'valid', {
      timeout: LAB_TIMEOUT_MS,
    })
  })

  test('rejecting the request leaves the lab unconnected', async ({
    page,
    metamask,
  }) => {
    await page.goto('/?preset=preset-2')
    await expect(page.getByText('Continue to your wallet')).toBeVisible({
      timeout: LAB_TIMEOUT_MS,
    })

    await page.getByRole('button', { name: /^MetaMask/ }).click()

    await metamask.rejectPendingRequest()

    await expect(page.getByRole('button', { name: /^MetaMask/ })).toBeVisible({
      timeout: LAB_TIMEOUT_MS,
    })
    await expect(page.getByTestId('wallet-address')).toBeHidden()
  })
})
