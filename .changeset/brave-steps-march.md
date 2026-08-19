---
'@zerodev/react-ui': patch
'@zerodev/smart-routing-address-react-ui': patch
---

feat(react-ui): promote `ProgressStep` to a shared primitive

`ProgressStep` — one row of a vertical progress trail (status marker,
connector line, label, info tooltip, trailing slot) — moves out of
smart-routing-address-react-ui's `TransactionDetails` page into react-ui.

- New exports: `ProgressStep`, `ProgressStepProps`, `ProgressStepStatus`.
- The private `done`/`failed` booleans become a single
  `status: 'done' | 'active' | 'pending' | 'failed'` prop; `active` is new
  and renders a spinner marker for in-flight steps.
- smart-routing-address-react-ui consumes the shared component; its
  Transaction Progress section is visually unchanged.
