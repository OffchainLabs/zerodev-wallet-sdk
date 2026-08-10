import type { Address } from 'viem'
import { useSmartRoutingAddressContext } from '../context/SmartRoutingAddressContext'

export type UseCreateSmartRoutingAddressResult = {
  /**
   * Return the deposit address for the recipient, creating it if it doesn't
   * exist yet. Idempotent per recipient — concurrent and repeated calls
   * share one request, so it's safe to call on every hover/focus/mount.
   * Rejects when creation fails (the failure also lands in the read hook's
   * `addressState`). Creation params (`actions`, `slippage`, …) come from
   * the provider config so the address always matches what the widget
   * displays — there are no per-call overrides. To create addresses with
   * bespoke params, use `createSmartRoutingAddress` from
   * `@zerodev/smart-routing-address`.
   */
  getOrCreateAddress: (recipient: Address) => Promise<Address>
}

/**
 * Action counterpart to `useSmartRoutingAddress` (which is read-only): lets
 * hosts embedding the `<SmartRoutingAddress />` widget pre-create the
 * deposit address — e.g. on hover or route entry, before the modal opens —
 * so the widget renders instantly.
 */
export function useCreateSmartRoutingAddress(): UseCreateSmartRoutingAddressResult {
  const { getOrCreateAddress } = useSmartRoutingAddressContext()
  return { getOrCreateAddress }
}
