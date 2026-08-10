import { useSmartRoutingAddressContext } from '../context/SmartRoutingAddressContext'
import type { ActiveRoute, AddressState } from '../types'

export type UseSmartRoutingAddressResult = {
  addressState: AddressState
  /**
   * The route the widget's deposit UI is currently showing (source token +
   * chain + estimated fee). `null` until the picker has seeded a selection.
   * Read-only by design: the widget's picker owns this value; hosts mirror
   * it (e.g. to drive a companion send panel), they don't set it.
   */
  activeRoute: ActiveRoute | null
}

/**
 * Read-only companion hook for hosts embedding the `<SmartRoutingAddress />`
 * widget: observe the address state and mirror the route the widget is
 * showing, from anywhere inside the provider. Its action counterpart is
 * `useCreateSmartRoutingAddress`. Not a kit for building a custom deposit
 * UI — for that, use `@zerodev/smart-routing-address` directly.
 */
export function useSmartRoutingAddress(): UseSmartRoutingAddressResult {
  const { addressState, activeRoute } = useSmartRoutingAddressContext()
  return { addressState, activeRoute }
}
