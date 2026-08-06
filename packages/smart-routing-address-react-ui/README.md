# @zerodev/smart-routing-address-react-ui

React UI kit for [ZeroDev Smart Routing Address](https://docs.zerodev.app/) —
a drop-in **funding widget** that generates a single deposit address, routes
whatever the user sends across chains and tokens, and reports live status.

Mount one component, get a full deposit-funding experience: token & source
chain picker, QR + copy card, live fee breakdown, pending/past deposit lists,
and a per-transaction details view. UI styling comes from
[`@zerodev/react-ui`](../react-ui/README.md).

## Installation

```bash
pnpm add @zerodev/smart-routing-address-react-ui \
  @zerodev/smart-routing-address viem
```

> `@zerodev/smart-routing-address`, `react` (18 or 19), `react-dom`, and
> `viem` are **peer dependencies** — install them alongside this package.

## Setup

### 1. Import the stylesheet once at app entry

```tsx
import '@zerodev/smart-routing-address-react-ui/styles.css'
```

### 2. Wrap the subtree in `SmartRoutingAddressProvider`

The provider holds the config and lazily creates the smart routing address
for a recipient. It doesn't render the widget — mount `<SmartRoutingAddress
/>` inline where you want the UI.

```tsx
import {
  SmartRoutingAddress,
  SmartRoutingAddressProvider,
} from '@zerodev/smart-routing-address-react-ui'
import { arbitrum } from 'viem/chains'

function Funding({ recipient }: { recipient: `0x${string}` }) {
  return (
    <SmartRoutingAddressProvider
      config={{
        projectId: 'your-project-id', // from https://dashboard.zerodev.app
        targetChainId: arbitrum.id,
      }}
    >
      <SmartRoutingAddress recipient={recipient} onClose={() => {}} />
    </SmartRoutingAddressProvider>
  )
}
```

## Usage

`<SmartRoutingAddress />` renders the current step (deposit, past deposits,
or a single transaction's details) inside its own card frame. Navigation is
owned by the widget; `onClose` fires when the top-right ✕ is tapped so the
host app can dismiss.

```tsx
<SmartRoutingAddress
  recipient={recipient}
  onClose={() => setOpen(false)}
  onHelp={() => window.open('https://your-docs.example', '_blank')}
  size="lg" // 'sm' | 'md' | 'lg'
/>
```

Address creation and deposit polling happen in the provider; the widget
subscribes to state via `useSmartRoutingAddress()` / `useDepositStatus()` so
host code can mirror the same data (e.g. show pending deposits elsewhere in
the app).

## Configuration

Everything the widget needs is on the config passed to the provider.

| Field | Type | Description |
| --- | --- | --- |
| `projectId` | `string?` | ZeroDev project id; appended to the SRA server URL. |
| `targetChainId` | `number` | Chain id where funds settle. **Required.** |
| `version` | `SmartRoutingAddressVersion?` | SRA manager version. Defaults to the latest stable. |
| `actions` | `CreateSmartRoutingAddressParams['actions']?` | Destination actions per token type. When omitted, deposits are simply transferred to the recipient. |
| `slippage` | `number?` | Max slippage in basis points (50 = 0.5%). When omitted, the SRA server picks its default. |
| `baseUrl` | `string?` | Override the SRA server root URL; the `projectId` is appended. |
| `pollingInterval` | `number?` | Deposit-status polling interval in ms (default 5000). |
| `estimatedFillTimeSeconds` | `number \| Record<number, number>?` | Expected fill time, flat or per source chain id. |

## API

| Export | Description |
| --- | --- |
| `<SmartRoutingAddressProvider />` | Wraps the subtree; owns config, recipient, and the address lifecycle. |
| `<SmartRoutingAddress />` | The funding widget UI. Props: `recipient`, `onClose`, `onHelp?`, `size?`, `className?`. |
| `useSmartRoutingAddress()` | Read the current address state and active route from the provider. |
| `useDepositStatus({ address })` | Poll the SRA status endpoint; returns `deposits`, `totalCount`, `hasLoaded`, `error`, `refetch`. |
| `useNewDeposits(deposits, hasLoaded)` | Filter to deposits that arrived after mount. |

### Types

`SmartRoutingAddressConfig`, `SmartRoutingAddressProps`,
`SmartRoutingAddressStep`, `SmartRoutingAddressProviderProps`,
`UseDepositStatusParams`, `UseDepositStatusResult`,
`UseSmartRoutingAddressResult`.

## Development

```bash
pnpm build       # build the package (dist + types + css)
pnpm dev         # watch mode (types)
pnpm typecheck
pnpm test        # vitest
pnpm storybook   # component catalog
```
