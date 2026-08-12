import type { KernelAccountClient } from '@zerodev/sdk'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { mainnet } from 'wagmi/chains'
import { createZeroDevWalletStore } from './store.js'

describe('createZeroDevWalletStore', () => {
  it('invalidates every derived signer cache when wallet ownership changes', () => {
    const store = createZeroDevWalletStore()
    const firstOwner = privateKeyToAccount(`0x${'11'.repeat(32)}`)
    const secondOwner = privateKeyToAccount(`0x${'22'.repeat(32)}`)
    store.getState().setEoaAccount(firstOwner)
    store
      .getState()
      .setKernelAccount(1, { address: firstOwner.address } as never)
    store.getState().setKernelClient(1, {} as KernelAccountClient)
    store.getState().setWalletClient(
      1,
      createWalletClient({
        account: firstOwner,
        chain: mainnet,
        transport: http(),
      }),
    )

    store.getState().setEoaAccount(secondOwner)

    expect(store.getState().kernelAccounts.size).toBe(0)
    expect(store.getState().kernelClients.size).toBe(0)
    expect(store.getState().walletClients.size).toBe(0)
  })

  it('retains derived clients when a refreshed signer has the same address', () => {
    const store = createZeroDevWalletStore()
    const owner = privateKeyToAccount(`0x${'11'.repeat(32)}`)
    store.getState().setEoaAccount(owner)
    const kernelClient = {} as KernelAccountClient
    store.getState().setKernelClient(1, kernelClient)

    store.getState().setEoaAccount(owner)

    expect(store.getState().kernelClients.get(1)).toBe(kernelClient)
  })

  it('never persists the session (Core owns session state)', () => {
    const store = createZeroDevWalletStore()
    store.getState().setSession({
      id: 'sess-1',
      userId: 'user-1',
      organizationId: 'org-1',
      stamperType: 'apiKey',
      token: 'jwt',
      expiry: Date.now() + 60_000,
      createdAt: Date.now(),
    })

    // Sanity: the live state actually holds a session, so the assertion below
    // only passes because partialize strips it — not because it was absent.
    expect(store.getState().session).not.toBeNull()

    const { partialize } = store.persist.getOptions()
    const persisted = partialize?.(store.getState())

    expect(persisted).not.toHaveProperty('session')
  })
})
