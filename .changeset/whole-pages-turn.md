---
'@zerodev/wallet-react-ui': patch
---

feat: transaction history widget

- New `TxHistory` widget: day-grouped activity feed (Figma history screen)
  with `Screen`/`TopNav` chrome, tappable rows, and an optional
  "See Full History on Portal" footer. Takes `entries` — presentation-ready
  rows — so hosts own the data source.
- New `toTxHistoryEntries` adapter mapping the zerodev-data-api v1 activity
  feed (Zerion-backed) to those rows: past-tense titles, operation icons,
  chain names, unix-seconds → ms timestamps. Input types exported
  (`HistoryTransaction`, `HistoryFeedItem`, …).
- New shared components: `TxHistoryItem` (activity row) and `TokenSummary`
  (token-logo hero with fiat value + crypto amount).
