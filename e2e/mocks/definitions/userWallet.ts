import type { MockRequest } from '../types.js'

/**
 * Replaces the wallet address the app reports.
 *
 * The address is fabricated so the assertion cannot pass by accident — a real
 * login can't produce it.
 */

export const MOCK_WALLET_ADDRESS = '0xdeadbeef00000000000000000000000000001234'

export const userWallet: MockRequest[] = [
  {
    // Any host and project id: the KMS base URL moves with `?kms=`.
    url: /\/user-wallet$/,
    method: 'GET',
    response: {
      walletAddresses: [MOCK_WALLET_ADDRESS],
      userId: 'mocked-user-id',
    },
  },
]
