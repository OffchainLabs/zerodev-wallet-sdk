import type { MockRequest } from '../types.js'

/**
 * Makes the wallet report a Google account regardless of how you signed in.
 *
 * `GET {projectId}/authenticators` returns its body straight through
 * (`packages/core/src/actions/auth/getAuthenticators.ts`), so the mocked shape
 * is exactly what the SDK hands to `useAuthenticators`, and `WalletStrip`'s
 * `formatAuthMethod` turns `oauths[0].provider` into the chip's label.
 *
 * "Google" after an OTP login is a state the app cannot reach on its own, which
 * is the point: the assertion cannot pass unless the mock served the response.
 *
 * A plain REST GET on purpose. Contract and balance reads are batched through
 * Multicall3 (wagmi defaults to `batch: { multicall: true }`), so mocking those
 * means answering `aggregate3` with an entry per call in a batch whose size
 * depends on render timing — see the note in `repros/`.
 */
export const authMethod: MockRequest[] = [
  {
    // Any host and project id: the KMS base URL moves with `?kms=`.
    url: /\/authenticators$/,
    method: 'GET',
    response: {
      oauths: [{ provider: 'GOOGLE' }],
      passkeys: null,
      emailContacts: null,
      apiKeys: null,
    },
  },
]

/** What the chip renders for the mocked provider. */
export const MOCK_AUTH_METHOD_LABEL = 'Google'
