/**
 * In-process adapter for the same `MockRequest[]` the Mockttp proxy consumes.
 *
 * Two ways to serve one set of mock definitions. The proxy (`server.ts`) sits
 * outside the browser and catches everything, including the hosts the SDK
 * hardcodes; this one patches `fetch` inside the page, so it needs no second
 * process and no CA, but only sees requests the page itself makes.
 *
 * Matching MUST stay in step with `applyMocks` or the same preset would behave
 * differently depending on which adapter served it — the reason `orderMocks` is
 * shared rather than reimplemented here.
 *
 * Node-free on purpose: this runs in the browser, so it may only import
 * `types.ts` and `orderMocks.ts`. Importing `server.ts` would pull mockttp and
 * `node:http` into the client bundle.
 */

import { orderMocks } from './orderMocks.js'
import type { MockRequest, UnmatchedPolicy } from './types.js'

let active: MockRequest[] = []
let unmatchedPolicy: UnmatchedPolicy = 'passthrough'
/** Non-null only while installed; doubles as the install guard. */
let nativeFetch: typeof globalThis.fetch | null = null

export function isMockFetchInstalled(): boolean {
  return nativeFetch !== null
}

/** Replace the active mocks. Safe to call before or after installing. */
export function setMocks(
  mocks: MockRequest[],
  unmatched: UnmatchedPolicy = 'passthrough',
): void {
  active = orderMocks(mocks)
  unmatchedPolicy = unmatched
}

export function getActiveMocks(): readonly MockRequest[] {
  return active
}

/**
 * True when every key in `expected` is present in `actual` with a deep-equal
 * value. Extra keys on `actual` are ignored — the same subset semantics as
 * Mockttp's `withJsonBodyIncluding`, so `{ method: 'eth_call' }` matches any
 * JSON-RPC envelope for that method.
 */
export function jsonBodyIncludes(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object') {
    return actual === expected
  }
  if (actual === null || typeof actual !== 'object') return false

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length < expected.length) return false
    return expected.every((item, index) =>
      jsonBodyIncludes(actual[index], item),
    )
  }
  if (Array.isArray(actual)) return false

  return Object.entries(expected as Record<string, unknown>).every(
    ([key, value]) =>
      key in (actual as Record<string, unknown>) &&
      jsonBodyIncludes((actual as Record<string, unknown>)[key], value),
  )
}

function urlMatches(pattern: string | RegExp, url: string): boolean {
  return typeof pattern === 'string' ? pattern === url : pattern.test(url)
}

/** First match wins, mirroring Mockttp's rule semantics. */
export function matchMock(
  mocks: readonly MockRequest[],
  request: { url: string; method: string; body: string },
): MockRequest | undefined {
  return mocks.find((mock) => {
    if (mock.method !== request.method) return false
    if (!urlMatches(mock.url, request.url)) return false
    if (mock.bodyIncludes && !request.body.includes(mock.bodyIncludes)) {
      return false
    }
    if (mock.payload) {
      let parsed: unknown
      try {
        parsed = JSON.parse(request.body)
      } catch {
        return false
      }
      if (!jsonBodyIncludes(parsed, mock.payload)) return false
    }
    return true
  })
}

/**
 * Build the response body. A static JSON-RPC response would otherwise reply
 * with whatever `id` the preset was written with; callers that correlate
 * responses by id would reject it, so the request's own id wins. The preset is
 * copied rather than mutated — it is shared module state.
 */
function responseBody(mock: MockRequest, requestBody: string): object {
  const response = mock.response
  if (
    response === null ||
    typeof response !== 'object' ||
    Array.isArray(response) ||
    !('jsonrpc' in response)
  ) {
    return response
  }

  try {
    const parsed = JSON.parse(requestBody) as { id?: unknown }
    if (parsed && typeof parsed === 'object' && 'id' in parsed) {
      return { ...response, id: parsed.id }
    }
  } catch {
    // Not JSON — leave the response as authored.
  }
  return response
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function describeRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ url: string; method: string; body: string }> {
  if (input instanceof Request) {
    let body = ''
    try {
      body = await input.clone().text()
    } catch {
      // Unreadable or already-consumed body; match on url + method only.
    }
    return { url: input.url, method: input.method.toUpperCase(), body }
  }

  const url = input instanceof URL ? input.href : String(input)
  const method = (init?.method ?? 'GET').toUpperCase()
  // Only string bodies are matchable; FormData/Blob/streams fall through as ''.
  const body = typeof init?.body === 'string' ? init.body : ''
  return { url, method, body }
}

/**
 * Patch `globalThis.fetch`. Idempotent, and a no-op where there is no `fetch`
 * (SSR passes through untouched, so a server render never sees mocks).
 *
 * `globalThis` rather than `window` so the same function is exercisable under a
 * Node test runner — the adapter's tests run in the integration config.
 */
export function installMockFetch(options?: {
  mocks?: MockRequest[]
  unmatched?: UnmatchedPolicy
}): void {
  if (options?.mocks) setMocks(options.mocks, options.unmatched)
  if (typeof globalThis.fetch !== 'function' || nativeFetch) return

  // Keep the ORIGINAL for restoring; bind a separate copy for calling. Storing
  // the bound copy would mean uninstall never restores what was there, so
  // install/uninstall cycles would stack a wrapper each time.
  nativeFetch = globalThis.fetch
  const passthrough = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = await describeRequest(input, init)
    const mock = matchMock(active, request)

    if (mock) {
      return jsonResponse(responseBody(mock, request.body), mock.status ?? 200)
    }

    if (unmatchedPolicy === 'block') {
      console.warn(
        `[mock] blocked unmatched ${request.method} ${request.url}${
          request.body ? ` body=${request.body}` : ''
        }`,
      )
      return jsonResponse(
        {
          error: 'No mock matched',
          method: request.method,
          url: request.url,
        },
        501,
      )
    }

    return passthrough(input, init)
  }
}

export function uninstallMockFetch(): void {
  if (!nativeFetch) return
  globalThis.fetch = nativeFetch
  nativeFetch = null
  active = []
  unmatchedPolicy = 'passthrough'
}
