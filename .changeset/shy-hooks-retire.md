---
'@zerodev/smart-routing-address-react-ui': patch
---

refactor: slim the public API to the widget + one companion hook

Breaking for pre-release consumers:

- `useDepositStatus` and `useNewDeposits` are no longer exported — they are
  internal widget plumbing. To build a custom deposit UI, use the
  `@zerodev/smart-routing-address` SDK directly.
- `SmartRoutingAddressConfig` drops `pollingInterval` and
  `estimatedFillTimeSeconds` — polling cadence and displayed fill time are
  determined by the package, not the integrating app.
- `useSmartRoutingAddress` remains exported, redocumented as the companion
  hook for hosts embedding the widget (pre-create the address via
  `ensureAddress`, mirror `addressState` and the read-only `activeRoute`).
