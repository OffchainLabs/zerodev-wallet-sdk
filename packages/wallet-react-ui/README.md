# @zerodev/wallet-react-ui

React wallet UI kit for ZeroDev — a drop-in **authentication** flow built on top
of a standard [wagmi](https://wagmi.sh) setup, plus an enhanced wagmi connector
that drives it.

Mount one component, get a full embedded-wallet sign-in experience: a multi-step
screen for passkey / email / Google. UI styling comes from
[`@zerodev/react-ui`](../react-ui/README.md).

## Installation

```bash
pnpm add @zerodev/wallet-react-ui \
  @zerodev/wallet-core @zerodev/wallet-react \
  wagmi viem @wagmi/core @tanstack/react-query zustand
```

> `@zerodev/wallet-core`, `@zerodev/wallet-react`, `wagmi`, `viem`,
> `@wagmi/core`, `@tanstack/react-query`, and `zustand` are **peer
> dependencies** — install them alongside this package.

## Setup

### 1. Add the connector to your wagmi config

```tsx
import { zeroDevWallet } from '@zerodev/wallet-react-ui'
import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    zeroDevWallet({
      projectId: 'your-project-id', // from https://dashboard.zerodev.app
      chains: [sepolia],
    }),
  ],
  transports: { [sepolia.id]: http() },
})
```

### 2. Import the stylesheet once at app entry

```tsx
import '@zerodev/wallet-react-ui/styles.css'
```

### 3. Wrap your app in the wagmi + React Query providers

```tsx
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi-config'

const queryClient = new QueryClient()

function Root() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Usage

Mount `<AuthFlow />` to render the active sign-in screen. Connecting via the
`zeroDevWallet` connector is what opens the auth flow.

```tsx
import { AuthFlow } from '@zerodev/wallet-react-ui'
import { useAccount, useConnect } from 'wagmi'

function App() {
  const { status } = useAccount()
  const { connect, connectors } = useConnect()

  if (status !== 'connected') {
    return (
      <>
        <button onClick={() => connect({ connector: connectors[0] })}>
          Connect
        </button>
        <AuthFlow />
      </>
    )
  }

  return <YourApp />
}
```

### Customizing the sign-up page

Bare `<AuthFlow />` renders the canonical sign-up page (passkey → Google →
email). Which methods appear — and how — is decided by composition, not
config.

Keep the default page and set its options:

```tsx
<AuthFlow
  logo={<YourLogo />}
  renderSignUp={() => (
    <SignUp.Default
      emailAuthMethod="otp" // 'magicLink' (default) | 'otp'
      termsAndConditionsUrl="https://example.com/terms"
      privacyPolicyUrl="https://example.com/privacy"
    />
  )}
/>
```

Or compose the page yourself from the `SignUp.*` units:

```tsx
import { AuthFlow, SignUp } from '@zerodev/wallet-react-ui'

<AuthFlow
  renderSignUp={() => (
    <SignUp emailAuthMethod="otp" termsAndConditionsUrl="https://example.com/terms">
      <SignUp.Google />
      <SignUp.Divider />
      <SignUp.Email />
      <SignUp.Wallet walletId="metamask" />
      <SignUp.InstalledWallets excludeWalletIds={['metamask']} maxWallets={3} />
      <SignUp.MoreWallets />
    </SignUp>
  )}
/>
```

- `<SignUp>` (the root) owns the shared page state and the consent gate: when
  either terms URL is set, a checkbox appears and every method is blocked
  until the user agrees. `emailAuthMethod` picks the email verification flow.
- Units: `SignUp.Passkey`, `SignUp.Google`, `SignUp.Email`, `SignUp.Wallet`,
  `SignUp.InstalledWallets`, `SignUp.MoreWallets`, `SignUp.Divider`. Order and
  presence are yours; while one method is in flight, the others disable
  themselves.
- `SignUp.Wallet` pins one external wallet as its own row. `walletId` is the
  `WalletId` union (e.g. `'metamask'`, `'coinbase'`, `'rabby'`); the row
  connects the wallet when a live connector claims it (browser extension or a
  configured SDK connector) and is a link to the vendor's download page
  otherwise. `SignUp.InstalledWallets` auto-discovers installed wallets — one
  row per announced (EIP-6963) browser extension, nothing when none are
  installed; `excludeWalletIds` hides wallets by guide id or rdns, and
  `maxWallets` caps the list (default 4; curated guide wallets survive the
  cut first).
  `SignUp.MoreWallets` opens the full wallet-selection step instead.
- `SignUp.Default` is the canonical composition; it accepts the same props as
  the root and forwards them.
- Auth success/failure surfaces through wagmi — await `connect`, or watch
  `useAccount()`.

## API

| Export | Description |
| --- | --- |
| `zeroDevWallet` | wagmi connector with kit-specific auth extensions. |
| `<AuthFlow />` | Renders the current auth step (sign-in, OTP, verifying, etc.). Props: `logo`, `renderSignUp`, `size`, `onClose`. |
| `<SignUp />` | Compound sign-up page: `SignUp.Default` plus the composable units (`Passkey`, `Google`, `Email`, `Wallet`, `InstalledWallets`, `MoreWallets`, `Divider`). |
| `useAuth` | Read / drive the auth flow state. |

### Types

`AuthMethod`, `AuthStep`, `EmailAuthMethod`, `WalletId`,
`ZeroDevKitConnectorParams`.

## Development

```bash
pnpm build       # build the package (dist + types + css)
pnpm dev         # watch mode (types)
pnpm typecheck
pnpm test        # vitest
pnpm storybook   # component catalog
```
