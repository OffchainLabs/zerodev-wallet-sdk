import { createContext, useContext } from 'react'
import type { Address } from 'viem'
import type {
  ActiveRoute,
  AddressState,
  SmartRoutingAddressConfig,
} from '../types'

export type SmartRoutingAddressContextValue = {
  config: SmartRoutingAddressConfig
  addressState: AddressState
  /** Recipient of the active (or last requested) smart routing address */
  recipient?: Address | undefined
  /**
   * Return the smart routing address for the recipient, creating it if it
   * has not been created yet. Safe to call multiple times; concurrent calls
   * for the same recipient share one request, while a new recipient
   * triggers a fresh creation. Rejects when creation fails (the failure
   * also lands in `addressState`).
   */
  getOrCreateAddress: (recipient: Address) => Promise<Address>
  /**
   * Re-run address creation for the current recipient. No-op if no recipient
   * has been set yet. Wired to the "Failed to create deposit address" retry
   * button in the deposit UI.
   */
  retry: () => Promise<void>
  /**
   * The route currently shown in the deposit UI. `null` until the picker
   * seeds a selection. Hosts can read this to mirror the widget's state.
   */
  activeRoute: ActiveRoute | null
  /** Deposit UI internal — writes the current picker selection to context. */
  setActiveRoute: (route: ActiveRoute | null) => void
}

export const SmartRoutingAddressContext =
  createContext<SmartRoutingAddressContextValue | null>(null)

export function useSmartRoutingAddressContext(): SmartRoutingAddressContextValue {
  const context = useContext(SmartRoutingAddressContext)
  if (!context) {
    throw new Error(
      'Smart routing address components must be rendered inside <SmartRoutingAddressProvider>',
    )
  }
  return context
}
