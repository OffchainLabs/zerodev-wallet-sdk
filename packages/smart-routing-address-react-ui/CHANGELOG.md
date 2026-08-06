# @zerodev/smart-routing-address-react-ui

## 0.0.1

### Patch Changes

- Initial public release. Ships the `SmartRoutingAddress` funding widget, the
  `SmartRoutingAddressProvider` context, and the `useSmartRoutingAddress` /
  `useDepositStatus` / `useNewDeposits` hooks — mount one component to give
  users a single deposit address that routes any supported token from any
  supported source chain into the recipient on the configured target chain,
  with live fee quotes (Across / Relay), pending + past deposit lists, and
  a per-deposit transaction-details view.

  ```tsx
  import {
    SmartRoutingAddress,
    SmartRoutingAddressProvider,
  } from "@zerodev/smart-routing-address-react-ui";
  import "@zerodev/smart-routing-address-react-ui/styles.css";
  import { arbitrum } from "viem/chains";

  <SmartRoutingAddressProvider
    config={{ projectId: "…", targetChainId: arbitrum.id }}
  >
    <SmartRoutingAddress recipient={recipient} onClose={close} />
  </SmartRoutingAddressProvider>;
  ```
