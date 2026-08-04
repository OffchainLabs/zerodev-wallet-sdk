---
'@zerodev/wallet-react-ui': patch
---

feat: sign in with external wallets from the SignUp page

New composable units on the `SignUp` compound. Connecting an external wallet
makes it the active wagmi connection and closes the embedded-wallet flow.

- `SignUp.Wallet` pins one wallet as its own row. `walletId` is the new
  `WalletId` union (e.g. `'metamask'`): the row connects when a live connector
  claims the wallet (browser extension or configured SDK connector, with an
  INSTALLED badge for announced extensions) and links to the vendor's download
  page otherwise.
- `SignUp.InstalledWallets` auto-discovers announced (EIP-6963) extensions:
  one badged row per wallet, nothing when none are installed.
  `excludeWalletIds` hides wallets by guide id or rdns (dedupe against a
  pinned `SignUp.Wallet` row); `maxWallets` caps the list (default 4, known
  wallets ranked first).
- `SignUp.MoreWallets` adds a row that opens an overlay sheet with the full
  wallet grid — every known wallet plus any other live connector.
- New exported type `WalletId`; `AuthMethod` gains `'external-wallet'`.

```tsx
<SignUp>
  <SignUp.Email />
  <SignUp.Divider />
  <SignUp.Wallet walletId="metamask" />
  <SignUp.InstalledWallets excludeWalletIds={['metamask']} />
  <SignUp.MoreWallets />
</SignUp>
```
