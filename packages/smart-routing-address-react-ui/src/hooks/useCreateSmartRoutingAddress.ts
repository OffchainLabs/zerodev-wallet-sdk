import type { Address } from 'viem'
import { useSmartRoutingAddressContext } from '../context/SmartRoutingAddressContext'

export type UseCreateSmartRoutingAddressResult = {
  /**
   * Create the address for the recipient if needed (idempotent per
   * recipient; a new recipient triggers a fresh creation). Creation params
   * (`actions`, `slippage`, …) come from the provider config so the address
   * always matches what the widget displays — there are no per-call
   * overrides. To create addresses with bespoke params, use
   * `createSmartRoutingAddress` from `@zerodev/smart-routing-address`.
   */
  ensureAddress: (recipient: Address) => Promise<void>
}

/**
 * Action counterpart to `useSmartRoutingAddress` (which is read-only): lets
 * hosts embedding the `<SmartRoutingAddress />` widget pre-create the
 * deposit address — e.g. on hover or route entry, before the modal opens —
 * so the widget renders instantly.
 */
export function useCreateSmartRoutingAddress(): UseCreateSmartRoutingAddressResult {
  const { ensureAddress } = useSmartRoutingAddressContext()
  return { ensureAddress }
}
