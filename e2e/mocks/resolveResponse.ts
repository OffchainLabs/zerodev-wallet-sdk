import { echoJsonRpcId } from './jsonRpc.js'
import type { MockRequest, MockRequestContext } from './types.js'

/**
 * Shared by both adapters so a function response behaves identically in each.
 *
 * Invoke before echoing: `echoJsonRpcId` takes an `object`, which a function
 * satisfies, so the reverse order would return it un-invoked.
 */
export function resolveMockResponse(
  mock: MockRequest,
  request: MockRequestContext,
): object {
  const body =
    typeof mock.response === 'function' ? mock.response(request) : mock.response
  return echoJsonRpcId(body, request.body)
}
