# Request mocking

Replaces backend responses so a spec can assert states the real backend won't
produce on demand — a specific balance, an error, a slow or failed user-op.

A mock is plain data (`MockRequest`), so the same definition can be served two
ways:

| Adapter | Serves | Use for |
| --- | --- | --- |
| `routeMocks` | Playwright request interception (`page.route`) | Browser specs |
| `installMockFetch` | Patches `fetch` inside the page | Driving the app by hand, no runner |

Both share one matcher (`matchMock`) so a definition behaves identically either
way. Keep it that way — two matchers would drift.


## Writing a definition

Definitions live in `definitions/` — one file per thing you're replacing, so
they're reusable across specs. `definitions/userWallet.ts` is the worked
example: it swaps the wallet address the app reports.

```ts
import type { MockRequest } from '../types.js'

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
```

Fabricate values that a real login could never return (like the address above).
Then the assertion can only pass if the mock actually served it.

### Fields

| Field | Purpose |
| --- | --- |
| `url` | Exact string or `RegExp`, matched against the **full** URL (host + path). |
| `method` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE`. |
| `response` | JSON body returned on match. |
| `status` | Defaults to `200`. |
| `payload` | Optional **subset** match on the JSON body — listed keys must match, extra keys are ignored. |
| `bodyIncludes` | Optional raw substring match on the body. |
| `priority` | Higher wins when several mocks match. Defaults to `0`. |

`payload` is what separates JSON-RPC calls sharing one URL, e.g.
`{ method: 'eth_getBalance' }`.

`bodyIncludes` is the fallback when `payload` can't separate them because they
differ only inside `params` — the `balanceOf` / `decimals` / `symbol` calls in
one `useReadContracts` batch are all `{ method: 'eth_call' }`, so only the
encoded selector tells them apart (`'0x70a08231'` for `balanceOf`).

## Using it in a spec

```ts
import { expect, test } from '@playwright/test'
import { MOCK_WALLET_ADDRESS, userWallet } from '../mocks/definitions/userWallet.js'
import { routeMocks } from '../mocks/routeMocks.js'

test('wallet strip shows the mocked address', async ({ page }) => {
  // Install BEFORE navigating — see below.
  const mocked = await routeMocks(page, userWallet)

  await page.goto('/')

  await expect(page.getByTestId('wallet-address')).toHaveText(
    new RegExp(`^${MOCK_WALLET_ADDRESS}$`, 'i'),
    { timeout: 30_000 },
  )
  // A mock matching nothing leaves the real value on screen — a plausible
  // looking pass. Assert it actually served.
  expect(mocked.hits()).toBeGreaterThan(0)
})
```

No teardown needed — routes belong to the page and each test gets a fresh one.

### Install before anything navigates

`authedPage` fixture calls `page.goto('/')` **before** handing the page to the test body, so
`routeMocks(page, …)` inside a test using `authedPage` installs too late. Its
worker-scoped login runs on a separate page with no mocks at all. Whenever a mock needs to be applied on login, the `authedPage` fixture should not be used.

### Unmatched traffic

Anything not matched passes through to the real backend by default. Pass
`{ unmatched: 'block' }` to return `501` instead, when a spec must fail loudly
rather than quietly hit staging:

```ts
await routeMocks(page, userWallet, { unmatched: 'block' })
```

### JSON-RPC ids

You don't need to get `id` right in a definition. Both adapters copy the
request's `id` onto a JSON-RPC response (`jsonRpc.ts`) — clients correlate a
reply to its call by that field, and viem rejects a mismatch with a vague
transport error that never mentions ids.
