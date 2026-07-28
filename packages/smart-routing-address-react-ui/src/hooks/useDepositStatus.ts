import type { DepositedToken } from '@zerodev/smart-routing-address'
import { getSmartRoutingAddressStatus } from '@zerodev/smart-routing-address'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import { DEFAULT_POLLING_INTERVAL_MS } from '../constants'

export type UseDepositStatusParams = {
  address: Address | undefined
  enabled?: boolean | undefined
  pollingInterval?: number | undefined
  baseUrl?: string | undefined
}

export type UseDepositStatusResult = {
  deposits: DepositedToken[]
  totalCount: number
  /** True once at least one status response has been received */
  hasLoaded: boolean
  isLoading: boolean
  error: Error | null
  /** Trigger an immediate poll — used by the "Retry" button after a fetch
   * error. No-op while no address is set. */
  refetch: () => void
}

const INITIAL_STATE = {
  deposits: [] as DepositedToken[],
  totalCount: 0,
  hasLoaded: false,
  isLoading: false,
  error: null as Error | null,
}

/**
 * Polls the smart routing address status endpoint while enabled, returning
 * the current list of deposits.
 */
export function useDepositStatus({
  address,
  enabled = true,
  pollingInterval = DEFAULT_POLLING_INTERVAL_MS,
  baseUrl,
}: UseDepositStatusParams): UseDepositStatusResult {
  const [state, setState] = useState(INITIAL_STATE)
  // Exposed via `refetch`; reassigned every time the effect runs so we always
  // point at the poller bound to the current (address, baseUrl) pair.
  const pollRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!address || !enabled) {
      pollRef.current = null
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const result = await getSmartRoutingAddressStatus({
          smartRoutingAddress: address,
          ...(baseUrl && { config: { baseUrl } }),
        })
        if (cancelled) return
        setState({
          deposits: result.deposits,
          totalCount: result.totalCount,
          hasLoaded: true,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        if (cancelled) return
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }))
      }
    }

    pollRef.current = () => {
      setState((previous) => ({ ...previous, isLoading: true, error: null }))
      poll().catch(() => {})
    }

    setState((previous) => ({ ...previous, isLoading: true }))
    poll().catch(() => {})
    const intervalId = setInterval(() => {
      poll().catch(() => {})
    }, pollingInterval)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      pollRef.current = null
    }
  }, [address, enabled, pollingInterval, baseUrl])

  const refetch = useCallback(() => {
    pollRef.current?.()
  }, [])

  return { ...state, refetch }
}
