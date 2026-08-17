---
'@zerodev/smart-routing-address-react-ui': patch
---

design: TxnItem gets the two Figma variants

- Compact (active deposits, `20002:36061`): single 44px token mark with a
  source-chain badge; status moves above the timestamp and "Received" reads
  in plain ink.
- Detailed (past deposits, `20002:37771`): `amount → destAmount` headline,
  a chain-route line (source › destination), and the destination token as
  the mark badge. Activated by the new `destAmount` prop plus
  `sourceChainName`/`destChainName`.
- New terminal `Delivered` status (green); past deposits' completed stage
  maps to it, and their rows show the delivered amount from the execution's
  `outputAmount`.
- Active-deposits card matches Figma 20002:36058: title "Active Deposit",
  card paddings/row gap corrected, and Routing rows gain a spinning
  rays marker (new `line-loading` glyph) beside the orange label.
