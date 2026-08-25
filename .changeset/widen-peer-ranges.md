---
'@zerodev/wallet-react': minor
'@zerodev/wallet-react-ui': minor
---

Publish internal peer dependencies as ranges instead of exact pins:
`@zerodev/wallet-react` now declares `@zerodev/wallet-core >=0.1.0`, and
`@zerodev/wallet-react-ui` declares `@zerodev/wallet-core >=0.1.0` and
`@zerodev/wallet-react >=0.1.0`. Future in-range releases of those peers no
longer force a bump (previously an exact pin made every core release a
breaking change for dependents). Compatibility floors will be raised
explicitly when a release actually requires newer peer APIs.
