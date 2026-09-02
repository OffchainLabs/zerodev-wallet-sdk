---
'@zerodev/wallet-react-ui': patch
---

fix: wallet connect buttons were a silent no-op on wagmi v2 hosts

Five components destructured `const { mutate: connect } = useConnect()` — a
shape that only exists on wagmi v3, which spreads the raw TanStack mutation
into the hook's return. wagmi v2 strips `mutate`/`mutateAsync` and exposes
only the `connect`/`connectAsync` aliases, so on v2 hosts every click on an
installed wallet threw an uncaught `TypeError` before `eth_requestAccounts`
was sent, and with WalletConnect configured the pairing preload could throw
on `SignUp` mount.

Now destructuring `connect` directly, which is identical on both majors —
`connect` is wagmi's own alias for the same mutation function — keeping the
`wagmi ^2.19.0 || ^3.0.0` peer range honest.
