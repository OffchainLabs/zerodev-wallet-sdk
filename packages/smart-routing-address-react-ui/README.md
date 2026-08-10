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
pnpm add @zerodev/smart-routing-address-react-ui viem
```

> `react` (18 or 19), `react-dom`, and `viem` are **peer dependencies** —
> install them alongside this package. `@zerodev/smart-routing-address` ships
> as a regular dependency; install it directly only if you import from it
> (e.g. `createCall` for custom `actions`).

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

Address creation and deposit polling happen in the provider; host code can
observe the widget's state via `useSmartRoutingAddress()` (e.g. drive a
companion panel from the route the widget is showing) and pre-create the
address via `useCreateSmartRoutingAddress().ensureAddress` before the modal
opens. To build a fully custom deposit UI, use the
`@zerodev/smart-routing-address` SDK directly — this package's hooks are
widget plumbing, not a UI kit.

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

## API

| Export | Description |
| --- | --- |
| `<SmartRoutingAddressProvider />` | Wraps the subtree; owns config, recipient, and the address lifecycle. |
| `<SmartRoutingAddress />` | The funding widget UI. Props: `recipient`, `onClose`, `onHelp?`, `size?`, `className?`. |
| `useSmartRoutingAddress()` | Read-only widget companion for hosts: address state and the `activeRoute` the widget is showing. |
| `useCreateSmartRoutingAddress()` | Action counterpart: `ensureAddress(recipient)` pre-creates the deposit address (e.g. before opening the modal). Creation params come from the provider config. |

### Types

`SmartRoutingAddressConfig`, `SmartRoutingAddressProps`,
`SmartRoutingAddressStep`, `SmartRoutingAddressProviderProps`,
`UseSmartRoutingAddressResult`, `UseCreateSmartRoutingAddressResult`.

## Development

```bash
pnpm build       # build the package (dist + types + css)
pnpm dev         # watch mode (types)
pnpm typecheck
pnpm test        # vitest
pnpm storybook   # component catalog
```
