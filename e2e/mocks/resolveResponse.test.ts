import { describe, expect, it } from 'vitest'
import { resolveMockResponse } from './resolveResponse.js'
import type { MockRequest, MockRequestContext } from './types.js'

const request: MockRequestContext = {
  url: 'http://rpc.test/v1',
  method: 'POST',
  body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'eth_chainId' }),
}

const mock = (response: MockRequest['response']): MockRequest => ({
  url: request.url,
  method: 'POST',
  response,
})

describe('resolveMockResponse', () => {
  it('returns a static response as authored', () => {
    expect(resolveMockResponse(mock({ result: '0x1' }), request)).toEqual({
      result: '0x1',
    })
  })

  it('invokes a function response with the request', () => {
    const resolved = resolveMockResponse(
      mock((received) => ({ received })),
      request,
    )

    expect(resolved).toEqual({ received: request })
  })

  it('echoes the JSON-RPC id onto a function response', () => {
    const resolved = resolveMockResponse(
      mock(() => ({ jsonrpc: '2.0', id: 0, result: '0x1' })),
      request,
    )

    // Echoing before invoking would no-op: `echoJsonRpcId` skips anything that
    // isn't an object, and a function is not one, so id 0 would survive.
    expect(resolved).toEqual({ jsonrpc: '2.0', id: 7, result: '0x1' })
  })

  it('leaves a non-JSON-RPC function response untouched', () => {
    const resolved = resolveMockResponse(
      mock(() => ({ walletAddresses: ['0xabc'] })),
      request,
    )

    expect(resolved).toEqual({ walletAddresses: ['0xabc'] })
  })
})
