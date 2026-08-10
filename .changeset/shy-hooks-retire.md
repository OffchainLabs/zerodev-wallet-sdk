---
'@zerodev/smart-routing-address-react-ui': patch
---

refactor: slim the public API to the widget + two companion hooks

Breaking for pre-release consumers:

- `useDepositStatus` and `useNewDeposits` are no longer exported — they are
  internal widget plumbing. To build a custom deposit UI, use the
  `@zerodev/smart-routing-address` SDK directly.
- `SmartRoutingAddressConfig` drops `pollingInterval` and
  `estimatedFillTimeSeconds` — polling cadence and displayed fill time are
  determined by the package, not the integrating app.
- The companion hook splits into read and write halves:
  `useSmartRoutingAddress()` is now read-only (`addressState` and the
  widget-owned `activeRoute`); new `useCreateSmartRoutingAddress()` returns
  `ensureAddress` for pre-creating the deposit address before the widget
  mounts. Creation params come from the provider config (no per-call
  overrides), so the created address always matches what the widget displays.
- `@zerodev/smart-routing-address` moves from peer to regular dependency:
  the default integration no longer imports from it directly, so integrators
  only install it themselves when they use its helpers (e.g. `createCall`
  for custom `actions`).
