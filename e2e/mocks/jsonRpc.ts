/**
 * Shared by both adapters so a preset behaves identically through the proxy and
 * through the in-page `fetch` patch.
 *
 * Returns `response` with its `id` replaced by the request's, when both look
 * like JSON-RPC.
 */
export function echoJsonRpcId(response: object, requestBody: string): object {
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
