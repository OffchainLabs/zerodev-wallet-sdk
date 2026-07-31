import type { Mockttp } from 'mockttp'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * What the proxy does with a request that matches no mock.
 * - `passthrough` (default): forward to the real destination.
 * - `block`: return 501 and log the method/URL/body. Use for deterministic
 *   specs where un-mocked traffic must fail loudly.
 */
export type UnmatchedPolicy = 'passthrough' | 'block'

export interface MockRequest {
  /**
   * Matched against the request's REAL full URL (host + path), because the
   * browser is routed through Mockttp as a proxy. Exact string or RegExp.
   */
  url: string | RegExp
  method: HttpMethod
  /**
   * Optional PARTIAL (subset) JSON-body match. Present keys must match; extra
   * keys on the request are ignored. Distinguishes JSON-RPC calls sharing a
   * host, e.g. `{ method: 'eth_sendUserOperation' }`.
   */
  payload?: object
  /**
   * Optional raw substring match on the request body. For calls `payload` can't
   * separate because they differ only inside `params` — the three `eth_call`s
   * for `balanceOf` / `decimals` / `symbol` that one `useReadContracts` batch
   * fires share `{ method: 'eth_call' }`, so only the encoded selector tells
   * them apart, e.g. `'0x70a08231'` for `balanceOf`.
   */
  bodyIncludes?: string
  /** JSON body returned on match. */
  response: object
  /** HTTP status returned on match. Defaults to 200. */
  status?: number
  /** Higher wins when multiple mocks match. Defaults to 0. */
  priority?: number
}

export interface WithMockOptions {
  /** Compose presets by spreading, e.g. `[...happyPath, myOverride]`. */
  mocks: MockRequest[]
  /** Defaults to `passthrough`. */
  unmatched?: UnmatchedPolicy
}

export interface TestSuiteParams {
  mockServer: Mockttp
}

export type TestSuiteFunction = (params: TestSuiteParams) => Promise<void>
