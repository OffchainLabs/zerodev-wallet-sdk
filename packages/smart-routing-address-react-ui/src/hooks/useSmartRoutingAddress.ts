import type { Address } from 'viem'
import { useSmartRoutingAddressContext } from '../context/SmartRoutingAddressContext'
import type { ActiveRoute, AddressState } from '../types'

export type UseSmartRoutingAddressResult = {
  addressState: AddressState
  /**
   * Create the address for the recipient if needed (idempotent per
   * recipient; a new recipient triggers a fresh creation)
   */
  ensureAddress: (recipient: Address) => Promise<void>
  /**
   * The route the widget's deposit UI is currently showing (source token +
   * chain + estimated fee). `null` until the picker has seeded a selection.
   * Read-only by design: the widget's picker owns this value; hosts mirror
   * it (e.g. to drive a companion send panel), they don't set it.
   */
  activeRoute: ActiveRoute | null
}

/**
 * Companion hook for hosts embedding the `<SmartRoutingAddress />` widget:
 * read the address state or pre-create the address (e.g. before opening the
 * modal) from anywhere inside the provider, and mirror the route the widget
 * is showing. Not a kit for building a custom deposit UI — for that, use
 * `@zerodev/smart-routing-address` directly.
 */
export function useSmartRoutingAddress(): UseSmartRoutingAddressResult {
  const { addressState, ensureAddress, activeRoute } =
    useSmartRoutingAddressContext()
  return { addressState, ensureAddress, activeRoute }
}
