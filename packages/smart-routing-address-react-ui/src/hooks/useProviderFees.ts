import type { TOKEN_TYPE } from '@zerodev/smart-routing-address'
import { useEffect, useState } from 'react'
import type { Address, Chain } from 'viem'
import { zeroAddress } from 'viem'
import type { EstimatedFeeData, SourceToken } from '../types'
import { resolveTokenAddress } from '../utils/fees'
import {
  AcrossSuggestedFeesSchema,
  type FeeBreakdown,
  parseAcrossFees,
  parseRelayFees,
  RelayQuoteSchema,
} from '../utils/providerFees'

const ACROSS_API = 'https://app.across.to/api/suggested-fees'
const RELAY_API = 'https://api.relay.link/quote'
// Quotes barely depend on the caller; used only when no recipient is known
const QUOTE_USER: Address = '0x1111111111111111111111111111111111111111'

type Route = {
  tokenType: TOKEN_TYPE
  originChainId: number
  destinationChainId: number
  amount: string
  user: Address
  symbol: string
  decimals: number
}

/** Across is keyed by ERC-20 addresses; native is quoted via its wrapped form */
function acrossToken(tokenType: TOKEN_TYPE, chainId: number): Address | null {
  if (tokenType === 'NATIVE') return resolveTokenAddress('WETH', chainId)
  return resolveTokenAddress(tokenType, chainId)
}

/** Relay represents native as the zero address; ERC-20s by their address */
function relayToken(tokenType: TOKEN_TYPE, chainId: number): Address | null {
  if (tokenType === 'NATIVE') return zeroAddress
  return resolveTokenAddress(tokenType, chainId)
}

async function fetchAcross(
  route: Route,
  signal: AbortSignal,
): Promise<FeeBreakdown | null> {
  const inputToken = acrossToken(route.tokenType, route.originChainId)
  const outputToken = acrossToken(route.tokenType, route.destinationChainId)
  if (!inputToken || !outputToken) return null
  const params = new URLSearchParams({
    inputToken,
    outputToken,
    originChainId: String(route.originChainId),
    destinationChainId: String(route.destinationChainId),
    amount: route.amount,
  })
  const res = await fetch(`${ACROSS_API}?${params}`, { signal })
  if (!res.ok) return null
  const json = await res.json()
  if (!json || json.error) return null
  // Validate the response shape before handing it to the parser — if Across
  // changes their API in a way we don't recognise, we degrade gracefully to
  // the collapsed fee view instead of computing garbage from missing fields.
  const parsed = AcrossSuggestedFeesSchema.safeParse(json)
  if (!parsed.success) {
    // biome-ignore lint/suspicious/noConsole: schema-drift signal for developers; silent failure is what we're trying to avoid.
    console.warn(
      '[useProviderFees] Across response failed schema validation',
      parsed.error.issues,
    )
    return null
  }
  return parseAcrossFees(parsed.data, route.symbol, route.decimals)
}

async function fetchRelay(
  route: Route,
  signal: AbortSignal,
): Promise<FeeBreakdown | null> {
  const originCurrency = relayToken(route.tokenType, route.originChainId)
  const destinationCurrency = relayToken(
    route.tokenType,
    route.destinationChainId,
  )
  if (!originCurrency || !destinationCurrency) return null
  const res = await fetch(RELAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      user: route.user,
      recipient: route.user,
      originChainId: route.originChainId,
      destinationChainId: route.destinationChainId,
      originCurrency,
      destinationCurrency,
      amount: route.amount,
      tradeType: 'EXACT_INPUT',
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  if (!json || json.error) return null
  // See fetchAcross above — schema validation is the last line of defence
  // between a silently changed API and wrong fees rendered to the user.
  const parsed = RelayQuoteSchema.safeParse(json)
  if (!parsed.success) {
    // biome-ignore lint/suspicious/noConsole: schema-drift signal for developers; silent failure is what we're trying to avoid.
    console.warn(
      '[useProviderFees] Relay response failed schema validation',
      parsed.error.issues,
    )
    return null
  }
  return parseRelayFees(parsed.data)
}

/** Pick the cheaper live route by full quoted cost; else the first available */
function bestRoute(routes: (FeeBreakdown | null)[]): FeeBreakdown | null {
  const available = routes.filter((r): r is FeeBreakdown => r !== null)
  if (available.length === 0) return null
  const withUsd = available.filter((r) => r.quotedTotalUsd !== null)
  if (withUsd.length === 0) return available[0] ?? null
  return withUsd.reduce((best, r) =>
    (r.quotedTotalUsd as number) < (best.quotedTotalUsd as number) ? r : best,
  )
}

export type ProviderFeesState = {
  /** Cheapest normalised quote, or null while loading / unquotable */
  fees: FeeBreakdown | null
  /** True from the moment the route changes until the quotes resolve */
  loading: boolean
}

/**
 * Fetch live fee quotes for the selected route from every supported provider
 * (Across + Relay), normalise them, and return the cheapest. Across and Relay
 * expose the itemised bridge legs the SRA fee estimate alone does not, so this
 * enriches the breakdown with how the user is actually charged and which route
 * is currently best.
 *
 * Returns null while loading, for routes that can't be quoted (native /
 * unresolvable tokens), or when every request fails — callers fall back to
 * the SRA execution fee on their own.
 */
export function useProviderFees(
  source: SourceToken | null,
  destChain: Chain,
  feeData: EstimatedFeeData | null,
  recipient?: string,
): ProviderFeesState {
  const [breakdown, setBreakdown] = useState<FeeBreakdown | null>(null)
  const [loading, setLoading] = useState(false)

  const sourceChainId = source?.chain.id
  const tokenType = source?.tokenType
  const destChainId = destChain.id
  const minDeposit = feeData?.minDeposit
  const symbol = feeData?.name
  const decimals = feeData?.decimal

  useEffect(() => {
    setBreakdown(null)
    if (
      tokenType === undefined ||
      sourceChainId === undefined ||
      !minDeposit ||
      symbol === undefined ||
      decimals === undefined
    ) {
      setLoading(false)
      return
    }
    setLoading(true)

    let amount: string
    try {
      amount = BigInt(minDeposit).toString()
    } catch {
      return
    }

    const route: Route = {
      tokenType,
      originChainId: sourceChainId,
      destinationChainId: destChainId,
      amount,
      user: (recipient as Address) || QUOTE_USER,
      symbol,
      decimals,
    }

    const controller = new AbortController()
    // Swallow provider failures so one broken provider doesn't take out the
    // other — but log everything except the expected abort so a real bug
    // (network, parser regression) doesn't disappear silently.
    const safe = (label: string, p: Promise<FeeBreakdown | null>) =>
      p.catch((err) => {
        if (err?.name !== 'AbortError') {
          // biome-ignore lint/suspicious/noConsole: surfaces network / parser regressions that would otherwise be invisible.
          console.warn(`[useProviderFees] ${label} failed`, err)
        }
        return null
      })
    Promise.all([
      safe('Across', fetchAcross(route, controller.signal)),
      safe('Relay', fetchRelay(route, controller.signal)),
    ])
      .then(([across, relay]) => {
        const chosen = bestRoute([across, relay])
        if (!controller.signal.aborted) {
          setBreakdown(chosen)
          setLoading(false)
        }
      })
      .catch(() => {
        // All providers failed → caller shows the SRA fee
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [
    sourceChainId,
    tokenType,
    destChainId,
    minDeposit,
    symbol,
    decimals,
    recipient,
  ])

  return { fees: breakdown, loading }
}
