---
'@zerodev/smart-routing-address-react-ui': patch
---

feat: require `slippage` in `SmartRoutingAddressConfig`

`@zerodev/smart-routing-address` 0.2.6 makes `slippage` a required
`createSmartRoutingAddress` param (the SRA server no longer supplies a
default), so the config field is now required too. The widget's
"Max slippage" row always renders as a result. Pick values with care:
tight slippage inflates `minDeposit`, which the server computes as
~fee / slippage.
