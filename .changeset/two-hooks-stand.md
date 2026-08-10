---
'@zerodev/smart-routing-address-react-ui': patch
---

feat: split the companion hook into read and write halves

- `useSmartRoutingAddress()` is now read-only: `{ addressState, activeRoute }`.
- New `useCreateSmartRoutingAddress()` returns `{ ensureAddress }` — the
  action half, for pre-creating the deposit address before the widget mounts.
  Creation params come from the provider config (no per-call overrides), so
  the created address always matches what the widget displays.
- `@zerodev/smart-routing-address` moves from peer to regular dependency:
  the default integration no longer imports from it directly, so integrators
  only install it themselves when they use its helpers (e.g. `createCall`
  for custom `actions`).
