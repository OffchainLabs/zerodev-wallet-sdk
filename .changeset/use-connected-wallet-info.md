---
'@zerodev/wallet-react-ui': patch
---

feat: `useConnectedWalletInfo` — identity of the wallet behind the active connection

New hook (the kit's equivalent of AppKit's `useWalletInfo`) returning
`{ name, icon, walletId, source }` for the active wagmi connection, or
`undefined` while disconnected.

wagmi's `useAccount().connector` already names injected wallets, but a
WalletConnect connection only reports "WalletConnect" — the actual wallet on
the other end (Trust, Rainbow, … on a phone) lives in the session's peer
metadata. This hook reads that from the provider and normalizes both paths
against the wallet guide, so wallet-specific handling and analytics
attribution work regardless of transport:

```tsx
const info = useConnectedWalletInfo()
// injected MetaMask → { name: 'MetaMask', walletId: 'metamask', source: 'injected' }
// Trust via WC      → { name: 'Trust Wallet', walletId: 'trust', source: 'walletconnect' }
// embedded wallet   → { name: 'ZeroDev Wallet', source: 'embedded' }
```

`source` is `'injected' | 'walletconnect' | 'embedded' | 'other'`. The
WalletConnect case resolves asynchronously (briefly `name: undefined` right
after connect/reload).
