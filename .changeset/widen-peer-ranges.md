---
'@zerodev/wallet-react': minor
'@zerodev/wallet-react-ui': minor
---

Publish internal peer dependencies as floor ranges instead of exact pins:
`@zerodev/wallet-react` now declares `@zerodev/wallet-core >=0.0.3`, and
`@zerodev/wallet-react-ui` declares `@zerodev/wallet-core >=0.0.3` and
`@zerodev/wallet-react >=0.0.5`. In-range peer releases no longer force a
version bump of the dependents; compatibility floors will be raised
explicitly when a release starts requiring newer peer APIs.
