'use client'

/**
 * Mock deposit layer for the demo. The SRA widget polls
 * `zd_getSmartRoutingAddressStatus`; here we intercept only that RPC call in
 * the browser and return a synthetic deposit list, so a sample deposit can
 * flow through the real widget UI (loading → detected → confirmed) without
 * any funds or real network. Address creation + fee estimates still hit the
 * live API — only the polling status is mocked.
 */

const STATUS_METHOD = 'zd_getSmartRoutingAddressStatus'
const CREATE_METHOD = 'zd_createSmartRoutingAddress'

/** A valid, well-checksummed placeholder address used for the "route not
 * found" state — the widget still validates it via the SDK before polling. */
const PLACEHOLDER_ADDRESS = '0x5Ea1f7C2B4E0d3a9c61b8E0d2F7A4c9B3D6E1a02'

/** Injected error states the developer controls can toggle. Only one is
 * active at a time — the mock branches by mode. */
export type MockErrorMode =
  | 'none'
  /** Address creation succeeds but returns no routes → "No routes found" */
  | 'route-not-found'
  /** Address creation itself fails → "Failed to create deposit address" */
  | 'address-create-failed'
  /** Deposit polling fails after address creation → "Failed to load deposits" */
  | 'polling-failed'

export type MockDeposit = {
  deposit: {
    chainId: number
    token: string
    amount: string
    blockNumber: string
    transactionHash: string
  }
  bridge: { blockNumber: string; transactionHash: string } | null
  execution: {
    blockNumber: string
    chainId: number | null
    outputToken: string
    transactionHash: string
    outputAmount: string
  } | null
  error: string | null
  createdAt?: string
}

let current: MockDeposit[] = []
let nativeFetch: typeof globalThis.fetch | null = null
let errorMode: MockErrorMode = 'none'
let sponsored = false

export function setMockDeposits(deposits: MockDeposit[]): void {
  current = deposits
}

/** Force a routing-failure state (empty estimates → "Route not found") */
export function setMockErrorMode(mode: MockErrorMode): void {
  errorMode = mode
}

/** Force every route's fees to read as sponsored, to preview the pill */
export function setMockSponsored(value: boolean): void {
  sponsored = value
}

/** Past simulated deposits persist in localStorage so repeated simulations
 * accumulate across reloads. Cleared safely. */
const PAST_KEY = 'sra-demo-past-deposits'

export function loadPastDeposits(): MockDeposit[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PAST_KEY)
    return raw ? (JSON.parse(raw) as MockDeposit[]) : []
  } catch {
    return []
  }
}

export function savePastDeposits(deposits: MockDeposit[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PAST_KEY, JSON.stringify(deposits))
  } catch {
    // Storage unavailable (private mode / quota) — non-fatal for the demo
  }
}

export function installMockFetch(): void {
  if (typeof window === 'undefined' || nativeFetch) return
  nativeFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const body = typeof init?.body === 'string' ? init.body : ''
    const passthrough = nativeFetch as typeof globalThis.fetch

    if (body.includes(STATUS_METHOD)) {
      if (errorMode === 'polling-failed') {
        return jsonRpcErrorResponse('Mock: status endpoint unavailable')
      }
      return jsonRpcResponse({
        deposits: current,
        totalCount: current.length,
        nextPage: null,
        totalPages: 1,
      })
    }

    // Address creation carries the fee estimates. Inject a routing failure
    // (no estimates) when toggled; otherwise pass through to the real API
    // and optionally stamp every route as sponsored to preview the pill.
    //
    // NOTE: the reference demo also corrupts the returned address's EIP-55
    // checksum (via `toFakeAddress`) so real wallets refuse to send to it.
    // We can't do that here — our widget's `useDepositStatus` passes the
    // address straight to `getSmartRoutingAddressStatus`, which runs
    // `validateAddress` in strict mode and rejects non-checksummed input.
    // Polling would error on every tick and the widget would sit forever
    // on "Watching for your deposit". Skipped until the widget re-checksums.
    if (body.includes(CREATE_METHOD)) {
      if (errorMode === 'address-create-failed') {
        return jsonRpcErrorResponse('Mock: address creation unavailable')
      }
      if (errorMode === 'route-not-found') {
        return jsonRpcResponse({
          smartRoutingAddress: PLACEHOLDER_ADDRESS,
          estimatedFees: [],
        })
      }
      const res = await passthrough(input, init)
      const json = await res.clone().json()
      const result = json?.result
      if (result?.smartRoutingAddress) {
        if (sponsored && Array.isArray(result.estimatedFees)) {
          for (const fee of result.estimatedFees) {
            for (const data of fee.data ?? []) data.isSponsored = true
          }
        }
        return jsonRpcResponse(result, json.id)
      }
      return res
    }

    return passthrough(input, init)
  }
}

export function uninstallMockFetch(): void {
  if (typeof window === 'undefined' || !nativeFetch) return
  window.fetch = nativeFetch
  nativeFetch = null
  current = []
  errorMode = 'none'
  sponsored = false
}

function jsonRpcResponse(result: unknown, id: number | string = 1): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Emit a JSON-RPC error envelope so the SDK's request wrapper throws — used
 * by the developer-controls error toggles to exercise the widget's retry UI. */
function jsonRpcErrorResponse(
  message: string,
  id: number | string = 1,
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function randomHash(): string {
  let hex = ''
  for (let i = 0; i < 64; i++) {
    hex += Math.floor(Math.random() * 16).toString(16)
  }
  return `0x${hex}`
}

function netAmount(amount: string, feeAmount: string): string {
  try {
    const gross = BigInt(amount)
    const fee = BigInt(feeAmount)
    return (gross > fee ? gross - fee : 0n).toString()
  } catch {
    return amount
  }
}

export type MockStage = 'pending' | 'bridging' | 'completed'

export type MockSimulationParams = {
  sourceChainId: number
  token: string
  amount: string
  feeAmount: string
  destChainId: number
  outputToken: string
}

/** A single simulation shares one deposit hash across stages so the widget
 * keeps tracking the same row while bridge/execution fields fill in. */
export function createSimulation(params: MockSimulationParams) {
  const depositHash = randomHash()
  const bridgeHash = randomHash()
  const execHash = randomHash()

  const snapshot = (stage: MockStage): MockDeposit => ({
    deposit: {
      chainId: params.sourceChainId,
      token: params.token,
      amount: params.amount,
      blockNumber: '0x1',
      transactionHash: depositHash,
    },
    bridge:
      stage === 'pending'
        ? null
        : { blockNumber: '0x2', transactionHash: bridgeHash },
    execution:
      stage === 'completed'
        ? {
            blockNumber: '0x3',
            chainId: params.destChainId,
            outputToken: params.outputToken,
            transactionHash: execHash,
            outputAmount: netAmount(params.amount, params.feeAmount),
          }
        : null,
    error: null,
    createdAt: new Date().toISOString(),
  })

  return { snapshot }
}

/** Reasons a deposit can fail to deliver, surfaced on the failed row */
const FAILURE_REASONS = [
  'Deposit was below the route minimum',
  'Deposit exceeded the route maximum',
  'Route expired before it could be filled',
]

/**
 * Build `count` historical mock deposits spread over the past few days (so
 * the date grouping and pagination are exercised), either delivered or
 * failed. Used by the developer controls to populate "Past deposits".
 */
export function buildMockDeposits(
  params: MockSimulationParams,
  count: number,
  options: { failed?: boolean } = {},
): MockDeposit[] {
  const hour = 3_600_000
  return Array.from({ length: count }, (_, index) => {
    const createdAt = new Date(Date.now() - index * 6 * hour).toISOString()
    const failed = options.failed === true
    return {
      deposit: {
        chainId: params.sourceChainId,
        token: params.token,
        amount: params.amount,
        blockNumber: '0x1',
        transactionHash: randomHash(),
      },
      bridge: failed
        ? null
        : { blockNumber: '0x2', transactionHash: randomHash() },
      execution: failed
        ? null
        : {
            blockNumber: '0x3',
            chainId: params.destChainId,
            outputToken: params.outputToken,
            transactionHash: randomHash(),
            outputAmount: netAmount(params.amount, params.feeAmount),
          },
      error: failed
        ? (FAILURE_REASONS[index % FAILURE_REASONS.length] ?? null)
        : null,
      createdAt,
    }
  })
}

/** Append mock deposits to the persisted "Past deposits" and show them now */
export function insertMockDeposits(deposits: MockDeposit[]): MockDeposit[] {
  const next = [...deposits, ...loadPastDeposits()]
  savePastDeposits(next)
  setMockDeposits(next)
  return next
}

/** Remove every mock deposit (persisted + currently shown) */
export function clearMockDeposits(): void {
  savePastDeposits([])
  setMockDeposits([])
}

/** The active route fields the simulation needs (subset of `ActiveRoute`) */
export type SimRoute = {
  sourceChainId: number
  token: string
  decimals: number
  feeAmount: string
}

/**
 * Build simulation params from the widget's active route + a fixed
 * destination chain. The mock reuses the source token address on the
 * destination side; the widget only cares that fields resolve, not that
 * this is realistic for every chain.
 */
export function simParamsFromRoute(
  route: SimRoute,
  destChainId: number,
  wholeAmount = '250',
): MockSimulationParams {
  // parseUnits inline to avoid another viem import at every call site.
  const amount = BigInt(
    Math.round(Number(wholeAmount) * 10 ** route.decimals),
  ).toString()
  return {
    sourceChainId: route.sourceChainId,
    token: route.token,
    amount,
    feeAmount: route.feeAmount,
    destChainId,
    outputToken: route.token,
  }
}
