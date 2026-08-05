export function isCancellationError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  // WebAuthn / passkey
  if (err.name === 'AbortError' || err.name === 'NotAllowedError') return true
  // EIP-1193 user rejection (external-wallet connect), via viem
  if (err.name === 'UserRejectedRequestError') return true
  // OAuth (existing logic, message-based)
  const msg = err.message.toLowerCase()
  return msg.includes('oauth popup was closed')
}
