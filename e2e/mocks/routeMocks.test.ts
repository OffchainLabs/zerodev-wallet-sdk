import type { Page } from '@playwright/test'
import { describe, expect, it } from 'vitest'
import { routeMocks } from './routeMocks.js'
import type { MockRequest } from './types.js'

type Fulfilled = { status?: number; contentType?: string; body?: string }
type RouteHandler = (route: unknown) => Promise<unknown>

/**
 * Stands in for a Playwright `Page`. `routeMocks` only ever calls `page.route`,
 * so capturing the handler is enough to exercise it without a browser — these
 * stay in the fast suite alongside the matcher's own tests.
 */
function createRouter() {
  let handler: RouteHandler | undefined
  let pattern: string | undefined

  const page = {
    route: async (p: string, h: RouteHandler) => {
      pattern = p
      handler = h
    },
  }

  /** Drives one request through the installed handler. */
  async function send(request: {
    url: string
    method?: string
    /** Absent means a body-less request, where Playwright returns null. */
    postData?: string
  }) {
    if (!handler) throw new Error('routeMocks never installed a route')

    let fulfilled: Fulfilled | undefined
    let continued = false

    await handler({
      request: () => ({
        url: () => request.url,
        method: () => request.method ?? 'GET',
        postData: () => request.postData ?? null,
      }),
      fulfill: async (options: Fulfilled) => {
        fulfilled = options
      },
      continue: async () => {
        continued = true
      },
    })

    return {
      fulfilled,
      continued,
      json: fulfilled?.body ? JSON.parse(fulfilled.body) : undefined,
    }
  }

  return { page: page as unknown as Page, send, pattern: () => pattern }
}

const RPC_URL = 'https://rpc.test/v1'

const userWallet: MockRequest = {
  url: /\/user-wallet$/,
  method: 'GET',
  response: { walletAddresses: ['0xabc'] },
}

describe('routeMocks', () => {
  it('intercepts every request, not just a prefix', async () => {
    const router = createRouter()

    await routeMocks(router.page, [userWallet])

    // A narrower pattern would let un-mocked hosts through unnoticed, which is
    // the whole point of intercepting at the browser.
    expect(router.pattern()).toBe('**/*')
  })

  it('serves the mocked body as JSON with a 200 by default', async () => {
    const router = createRouter()
    await routeMocks(router.page, [userWallet])

    const res = await router.send({
      url: 'https://kms.test/proj/user-wallet',
      method: 'GET',
    })

    expect(res.fulfilled?.status).toBe(200)
    expect(res.fulfilled?.contentType).toBe('application/json')
    expect(res.json).toEqual({ walletAddresses: ['0xabc'] })
    expect(res.continued).toBe(false)
  })

  it('honors a status override', async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      {
        url: /\/user-wallet$/,
        method: 'GET',
        status: 503,
        response: { error: 'down' },
      },
    ])

    const res = await router.send({ url: 'https://kms.test/p/user-wallet' })

    expect(res.fulfilled?.status).toBe(503)
    expect(res.json).toEqual({ error: 'down' })
  })

  it('passes unmatched traffic through by default', async () => {
    const router = createRouter()
    await routeMocks(router.page, [userWallet])

    const res = await router.send({ url: 'https://kms.test/p/something-else' })

    expect(res.continued).toBe(true)
    expect(res.fulfilled).toBeUndefined()
  })

  it("blocks unmatched traffic with 501 when unmatched is 'block'", async () => {
    const router = createRouter()
    await routeMocks(router.page, [userWallet], { unmatched: 'block' })

    const res = await router.send({
      url: 'https://kms.test/p/other',
      method: 'POST',
    })

    expect(res.continued).toBe(false)
    expect(res.fulfilled?.status).toBe(501)
    // The method and URL are what make a blocked request diagnosable.
    expect(res.json).toEqual({
      error: 'No mock matched',
      method: 'POST',
      url: 'https://kms.test/p/other',
    })
  })

  it('does not intercept a matching URL under a different method', async () => {
    const router = createRouter()
    await routeMocks(router.page, [userWallet]) // GET

    const res = await router.send({
      url: 'https://kms.test/p/user-wallet',
      method: 'POST',
    })

    expect(res.continued).toBe(true)
  })

  it('lets a higher-priority mock win regardless of listed order', async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      { ...userWallet, response: { winner: false }, priority: 1 },
      { ...userWallet, response: { winner: true }, priority: 5 },
    ])

    const res = await router.send({ url: 'https://kms.test/p/user-wallet' })

    // Listed second, so this can only win if priority ordering is applied.
    expect(res.json).toEqual({ winner: true })
  })

  it('separates JSON-RPC calls sharing a URL by payload, across repeat calls', async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      {
        url: RPC_URL,
        method: 'POST',
        payload: { method: 'eth_call' },
        response: { jsonrpc: '2.0', id: 0, result: '0xcall' },
      },
      {
        url: RPC_URL,
        method: 'POST',
        payload: { method: 'eth_getBalance' },
        response: { jsonrpc: '2.0', id: 0, result: '0xbalance' },
      },
    ])

    // Interleaved and repeated: routing must key off the body every time, not
    // land correctly once by ordering luck.
    const results = []
    for (const method of [
      'eth_getBalance',
      'eth_call',
      'eth_getBalance',
      'eth_call',
    ]) {
      const res = await router.send({
        url: RPC_URL,
        method: 'POST',
        postData: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
      })
      results.push(res.json?.result)
    }

    expect(results).toEqual(['0xbalance', '0xcall', '0xbalance', '0xcall'])
  })

  it('separates calls by bodyIncludes when the payload cannot', async () => {
    const router = createRouter()
    const envelope = (data: string) =>
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ data }],
      })

    await routeMocks(router.page, [
      {
        url: RPC_URL,
        method: 'POST',
        bodyIncludes: '0x70a08231', // balanceOf
        response: { jsonrpc: '2.0', id: 0, result: '0xbalanceOf' },
      },
      {
        url: RPC_URL,
        method: 'POST',
        bodyIncludes: '0x313ce567', // decimals
        response: { jsonrpc: '2.0', id: 0, result: '0xdecimals' },
      },
    ])

    const balanceOf = await router.send({
      url: RPC_URL,
      method: 'POST',
      postData: envelope('0x70a08231000000'),
    })
    const decimals = await router.send({
      url: RPC_URL,
      method: 'POST',
      postData: envelope('0x313ce567000000'),
    })

    expect(balanceOf.json?.result).toBe('0xbalanceOf')
    expect(decimals.json?.result).toBe('0xdecimals')
  })

  it("echoes the request's JSON-RPC id onto the response", async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      {
        url: RPC_URL,
        method: 'POST',
        payload: { method: 'eth_chainId' },
        // Authored with a placeholder id, as definitions are.
        response: { jsonrpc: '2.0', id: 0, result: '0x1' },
      },
    ])

    const res = await router.send({
      url: RPC_URL,
      method: 'POST',
      postData: JSON.stringify({
        jsonrpc: '2.0',
        id: 42,
        method: 'eth_chainId',
      }),
    })

    // viem correlates a reply to its call by id and rejects a mismatch with an
    // opaque transport error, so the served id must follow the request.
    expect(res.json).toEqual({ jsonrpc: '2.0', id: 42, result: '0x1' })
  })

  it('passes through a body-less request when a mock constrains the body', async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      // Same url + method as the request below, so only the body constraint can
      // reject it — and there is no body to test against.
      { ...userWallet, bodyIncludes: '0x70a08231' },
    ])

    const res = await router.send({ url: 'https://kms.test/p/user-wallet' })

    // Reaching the substring check with a null body would throw inside the
    // route handler rather than simply not match.
    expect(res.continued).toBe(true)
    expect(res.fulfilled).toBeUndefined()
  })

  it('counts only served requests, not passed-through or blocked ones', async () => {
    const router = createRouter()
    const handle = await routeMocks(router.page, [userWallet])

    expect(handle.hits()).toBe(0)

    await router.send({ url: 'https://kms.test/p/user-wallet' })
    await router.send({ url: 'https://kms.test/p/user-wallet' })
    await router.send({ url: 'https://kms.test/p/unmatched' }) // passthrough

    // Counting passthroughs would make `hits() > 0` meaningless as the guard
    // against a mock that matches nothing.
    expect(handle.hits()).toBe(2)
  })

  it('does not count blocked requests as hits', async () => {
    const router = createRouter()
    const handle = await routeMocks(router.page, [userWallet], {
      unmatched: 'block',
    })

    await router.send({ url: 'https://kms.test/p/unmatched' })

    expect(handle.hits()).toBe(0)
  })

  it('resolves a function response instead of serialising the function', async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      { ...userWallet, response: () => ({ walletAddresses: ['0xdynamic'] }) },
    ])

    const res = await router.send({ url: 'https://kms.test/p/user-wallet' })

    // `JSON.stringify(fn)` is `undefined`, so an unresolved function serves an
    // empty body instead of failing loudly.
    expect(res.json).toEqual({ walletAddresses: ['0xdynamic'] })
  })

  it('re-evaluates a function response on every request', async () => {
    const router = createRouter()
    let served = 0
    await routeMocks(router.page, [
      { ...userWallet, response: () => ({ served: ++served }) },
    ])

    const first = await router.send({ url: 'https://kms.test/p/user-wallet' })
    const second = await router.send({ url: 'https://kms.test/p/user-wallet' })

    // A definition that changes state between assertions depends on this;
    // resolving once at install would serve the same body forever.
    expect(first.json).toEqual({ served: 1 })
    expect(second.json).toEqual({ served: 2 })
  })

  it("echoes the request's JSON-RPC id onto a function response", async () => {
    const router = createRouter()
    await routeMocks(router.page, [
      {
        url: RPC_URL,
        method: 'POST',
        payload: { method: 'eth_chainId' },
        response: () => ({ jsonrpc: '2.0', id: 0, result: '0x1' }),
      },
    ])

    const res = await router.send({
      url: RPC_URL,
      method: 'POST',
      postData: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'eth_chainId',
      }),
    })

    // `echoJsonRpcId` takes an `object` and a function passes that check, so a
    // function resolved in the wrong order slips through un-echoed.
    expect(res.json).toEqual({ jsonrpc: '2.0', id: 7, result: '0x1' })
  })

  it('never invokes the function of a mock that lost on priority', async () => {
    const router = createRouter()
    let loserCalls = 0
    await routeMocks(router.page, [
      {
        ...userWallet,
        priority: 5,
        response: () => ({ winner: true }),
      },
      {
        ...userWallet,
        priority: 1,
        response: () => {
          loserCalls += 1
          return { winner: false }
        },
      },
    ])

    const res = await router.send({ url: 'https://kms.test/p/user-wallet' })

    // A stateful definition advances on being served, so invoking a loser
    // would move state no test asked to move.
    expect(res.json).toEqual({ winner: true })
    expect(loserCalls).toBe(0)
  })

  it('passes the matched url, method and body to a function response', async () => {
    const router = createRouter()
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
    })
    await routeMocks(router.page, [
      {
        url: RPC_URL,
        method: 'POST',
        response: (request) => ({ seen: request }),
      },
    ])

    const res = await router.send({ url: RPC_URL, method: 'POST', postData })

    // Reading the request is what lets a response depend on what was asked —
    // sizing a multicall reply to its batch, or paging a list.
    expect(res.json).toEqual({
      seen: { url: RPC_URL, method: 'POST', body: postData },
    })
  })
})
