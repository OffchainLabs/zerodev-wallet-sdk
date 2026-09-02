/**
 * The test wallet the browser e2e suite imports into a wallet extension.
 *
 * **One phrase across every wallet.** If some wallet ever needs its own phrase,
 * give that wallet an override here rather than splitting the shared pair.
 *
 * The phrase is a throwaway and unfunded. It lives in `.env`, never in the
 * repo, and in CI it comes from a secret.
 */

export interface WalletCredentials {
  /** Throwaway 12-word phrase. Comes from the environment, never the repo. */
  secretRecoveryPhrase: string
  /** Local to the cached extension profile. It protects nothing of value. */
  password: string
}

/**
 * Reads the credentials from the environment.
 * Fails loudly rather than defaulting.
 */
export function credentialsFromEnv(): WalletCredentials {
  const secretRecoveryPhrase = process.env.WALLET_SRP
  const password = process.env.WALLET_PASSWORD

  if (!secretRecoveryPhrase || !password) {
    throw new Error(
      'WALLET_SRP and WALLET_PASSWORD must be set to run the wallet-extension e2e suite. ' +
        'See .env.example — the phrase is a throwaway and belongs in .env, never in the repo.',
    )
  }
  return { secretRecoveryPhrase, password }
}
