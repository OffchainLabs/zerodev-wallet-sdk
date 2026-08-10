/**
 * @zerodev/smart-routing-address-react-ui
 * React hooks, provider, and UI for ZeroDev Smart Routing Address deposits.
 */

// Provider
export type { SmartRoutingAddressProviderProps } from './context/SmartRoutingAddressProvider'
export { SmartRoutingAddressProvider } from './context/SmartRoutingAddressProvider'
// Widget companion hook — for hosts embedding <SmartRoutingAddress />, not
// for building custom deposit UIs (use @zerodev/smart-routing-address for
// that). Data-plumbing hooks (useDepositStatus, useNewDeposits) are internal.
export type { UseSmartRoutingAddressResult } from './hooks/useSmartRoutingAddress'
export { useSmartRoutingAddress } from './hooks/useSmartRoutingAddress'

// Pages
export type {
  SmartRoutingAddressProps,
  SmartRoutingAddressStep,
} from './pages'
export { SmartRoutingAddress } from './pages'

// Types
export type { SmartRoutingAddressConfig } from './types'
