---
'@zerodev/wallet-react': patch
'@zerodev/wallet-react-ui': patch
---

fix: move `zustand` from peerDependencies to dependencies

The kit's store is created and consumed entirely by kit code — the host app
never touches it with its own zustand — so there is no singleton to share
and nothing for a peer range to protect. As a peer it only produced version
conflicts: hosts on zustand 4 (common, and often non-trivial to upgrade
because v5 removed the `useStore(selector, equalityFn)` signature) got
unmet-peer warnings on every install.

As a regular dependency each package resolves its own zustand 5 regardless
of what the host uses (or whether it uses zustand at all). Worst-case cost
is a few KB of duplication when the host also ships zustand; the kit's
`useStore` still binds to the host's React, so there are no hook-identity
concerns.
