/**
 * Session-restore / initialization behaviour of the wagmi connector.
 *
 * ⚠️ THREE OF THESE TESTS ARE MARKED `it.fails()` — they document a live
 * defect, they are not broken tests. `it.fails()` asserts the body throws, so
 * the suite is green while the bug exists and turns RED the moment someone
 * fixes it. When you land the fix, change them back to plain `it()`.
 *
 * Context: PR #365 ("require a valid, non-zero owner when building the
 * account") correctly stopped `toViemAccount` from silently falling back to
 * the zero address when the KMS `GET /{projectId}/user-wallet` call fails.
 * Owner resolution now throws instead of producing an unspendable account.
 *
 * That throw surfaces inside `doInitialize()` (`core/connector.ts:274`), which
 * is reached on every page load that restores a session. `initialize()` caches
 * its promise and never clears it on rejection:
 *
 *   const initialize = async () => {
 *     if (initPromise) return initPromise   // ← a rejected promise is cached
 *     initPromise = doInitialize()          //   forever; nothing resets it
 *     return initPromise
 *   }
 *
 * So a *transient* owner-resolution failure — a 10s REST timeout, a KMS 429/5xx,
 * an ACL 403 from a non-whitelisted origin — permanently disables the connector
 * for the lifetime of the page. Every later `setup()` / `connect()` /
 * `getStore()` / `getProvider()` replays the same stale rejection, so the app
 * cannot recover even once the network is healthy again.
 *
 * Failing closed is right; failing closed *permanently* on a blip is not.
 */
import type { Config } from '@wagmi/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sepolia } from 'wagmi/chains'

/** Owner EOA the KMS resolves to once the transient failure clears. */
const OWNER = '0x1111111111111111111111111111111111111111' as const
/** Kernel counterfactual address (unused in 7702 mode, but the SDK returns one). */
const KERNEL = '0xcafecafecafecafecafecafecafecafecafecafe' as const

/**
 * A locally-valid restored session: unexpired, so the storage manager hands it
 * back (`storage/manager.ts:71-75` only drops sessions past `expiry`) and
 * `doInitialize()` enters the restore branch. This is the precondition for the
 * defect — an *expired* session is filtered out and never reaches `toAccount()`.
 */
const RESTORED_SESSION = {
  id: 'session_indexedDb_1754300000000',
  userId: 'user-1',
  organizationId: 'suborg-1',
  stamperType: 'apiKey' as const,
  sessionType: 'SESSION_TYPE_READ_WRITE',
  token: 'header.payload.signature',
  expiry: Date.now() + 15 * 60 * 1000,
  createdAt: Date.now(),
}

// SDK mocks — hoisted so they exist before vi.mock() runs.
const {
  walletMock,
  createKernelAccountMock,
  createKernelAccountClientMock,
  createZeroDevPaymasterClientMock,
  signerToEcdsaValidatorMock,
} = vi.hoisted(() => ({
  walletMock: {
    getSession: vi.fn(),
    toAccount: vi.fn(),
    auth: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  },
  createKernelAccountMock: vi.fn(),
  createKernelAccountClientMock: vi.fn(),
  createZeroDevPaymasterClientMock: vi.fn(),
  signerToEcdsaValidatorMock: vi.fn(),
}))

vi.mock('@zerodev/sdk', () => ({
  createKernelAccount: createKernelAccountMock,
  createKernelAccountClient: createKernelAccountClientMock,
  createZeroDevPaymasterClient: createZeroDevPaymasterClientMock,
}))
vi.mock('@zerodev/sdk/constants', () => ({
  getEntryPoint: vi.fn().mockReturnValue({ version: '0.7' }),
  KERNEL_V3_3: 'v3.3',
}))
vi.mock('@zerodev/ecdsa-validator', () => ({
  signerToEcdsaValidator: signerToEcdsaValidatorMock,
}))
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem')
  return {
    ...actual,
    createPublicClient: vi.fn().mockReturnValue({}),
  }
})
// Keep the real module and override only the wallet factory. A hand-rolled
// partial mock silently omits helpers the connector's collaborators import
// (e.g. `normalizeTimestamp`, used by provider.ts) and fails as a confusing
// "not a function" deep inside a store subscription.
vi.mock('@zerodev/wallet-core', async () => {
  const actual = await vi.importActual<typeof import('@zerodev/wallet-core')>(
    '@zerodev/wallet-core',
  )
  return {
    ...actual,
    createZeroDevWallet: vi.fn().mockImplementation(async () => walletMock),
  }
})

import { zeroDevWalletCore } from './core/connector.js'

type ConnectorInstance = ReturnType<ReturnType<typeof zeroDevWalletCore>>

/** Default mode is '7702', where the wagmi-facing address is the owner EOA. */
function createConnector(): ConnectorInstance {
  const factory = zeroDevWalletCore({
    projectId: 'proj-test',
    chains: [sepolia],
  })
  const wagmiConfig = {
    transports: {},
    emitter: { emit: vi.fn() },
    storage: null,
  } as unknown as Config
  return factory(wagmiConfig as never) as ConnectorInstance
}

/**
 * What the KMS call looks like when it fails transiently. The REST transport
 * aborts at 10s (`core/client/transports/rest.ts`), and the same shape covers a
 * 429 from the KMS rate limiter or a 403 from the project ACL.
 */
function transientKmsFailure() {
  return new Error('Request timed out: https://kms.example.com/api/v1')
}

describe('zeroDevWallet connector — session restore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    walletMock.getSession.mockReset()
    walletMock.toAccount.mockReset()
    walletMock.logout.mockResolvedValue(true)
    createKernelAccountMock.mockResolvedValue({ address: KERNEL })
    createKernelAccountClientMock.mockReturnValue({})
    createZeroDevPaymasterClientMock.mockReturnValue({})
    localStorage.clear()
  })

  // Control: proves the harness itself is sound, so the three failures below
  // are the connector's behaviour and not a broken fixture.
  it('restores a session and connects with the resolved owner', async () => {
    walletMock.getSession.mockResolvedValue(RESTORED_SESSION)
    walletMock.toAccount.mockResolvedValue({ address: OWNER })
    const connector = createConnector()

    await connector.setup()
    const result = await connector.connect({ chainId: sepolia.id })

    expect(result.accounts).toEqual([OWNER])
  })

  /**
   * BREAK: no recovery through connect().
   * Fails until `initialize()` clears `initPromise` when `doInitialize()`
   * rejects. wagmi calls `setup()` when the config is created, so the blip
   * lands before the user has done anything; the subsequent user-initiated
   * connect must be allowed to succeed.
   */
  it.fails(
    'connects on the next attempt once a transient owner-resolution failure clears',
    async () => {
      walletMock.getSession.mockResolvedValue(RESTORED_SESSION)
      walletMock.toAccount
        .mockRejectedValueOnce(transientKmsFailure())
        .mockResolvedValue({ address: OWNER })
      const connector = createConnector()

      // Boot-time blip. Failing here is correct — better than a zero-address account.
      await expect(connector.setup()).rejects.toThrow(/timed out/)

      // Network is healthy now and the session is still valid: this must work.
      const result = await connector.connect({ chainId: sepolia.id })

      expect(result.accounts).toEqual([OWNER])
    },
  )

  /**
   * BREAK: the retry never reaches the wallet SDK at all.
   * Names the mechanism — the cached rejection short-circuits initialization,
   * so owner resolution is not re-attempted. Fails on the second `setup()`.
   */
  it.fails(
    're-attempts owner resolution after a failed init instead of replaying the cached rejection',
    async () => {
      walletMock.getSession.mockResolvedValue(RESTORED_SESSION)
      walletMock.toAccount
        .mockRejectedValueOnce(transientKmsFailure())
        .mockResolvedValue({ address: OWNER })
      const connector = createConnector()

      await expect(connector.setup()).rejects.toThrow(/timed out/)
      expect(walletMock.toAccount).toHaveBeenCalledTimes(1)

      await connector.setup()

      expect(walletMock.toAccount).toHaveBeenCalledTimes(2)
    },
  )

  /**
   * BREAK: the React surface stays dead.
   * `getStore()` is how the hooks reach connector state, so while it rejects
   * the app cannot render — not even a login screen to recover through.
   */
  it.fails(
    'exposes a usable store to the hooks once the failure clears',
    async () => {
      walletMock.getSession.mockResolvedValue(RESTORED_SESSION)
      walletMock.toAccount
        .mockRejectedValueOnce(transientKmsFailure())
        .mockResolvedValue({ address: OWNER })
      const connector = createConnector()

      await expect(connector.setup()).rejects.toThrow(/timed out/)

      // @ts-expect-error - getStore is added in the connector's Properties.
      const store = await connector.getStore()

      expect(store.getState().eoaAccount?.address).toBe(OWNER)
    },
  )
})
