---
'@zerodev/wallet-react-ui': patch
'@zerodev/react-ui': patch
---

feat: WalletConnect pairing for external wallets

wallet-react-ui:

- New export `zeroDevWalletConnect` — WalletConnect connector preconfigured
  for the kit.
- New sign-up unit `SignUp.WalletConnect` — generic pairing row with a QR
  sheet.
- `SignUp.Wallet` and `SignUp.MoreWallets` open a WalletConnect pairing
  sheet (QR + deep link) for wallets not present in the browser; on mobile,
  signing requests deep-link into the connected wallet app.
- fix: duplicate wallet entries in wallet in-app browsers; expired pairing
  proposals now surface an error with retry.

```tsx
connectors: [
  zeroDevWallet({ ... }),
  zeroDevWalletConnect({ projectId: 'your-reown-project-id' }),
]

<SignUp>
  <SignUp.InstalledWallets />
  <SignUp.WalletConnect />
  <SignUp.MoreWallets />
</SignUp>
```

react-ui:

- New export: `QrCode` (+ `QrCodeProps`). Adds the `uqr` dependency.
