import { describe, expect, it } from 'vitest'
import { matchesWallet, WALLET_GUIDE } from './walletGuide'

const metaMask = WALLET_GUIDE.find((w) => w.id === 'metaMask')
if (!metaMask) throw new Error('metaMask missing from WALLET_GUIDE')

describe('matchesWallet', () => {
  it('matches an announced connector by id', () => {
    expect(matchesWallet({ id: 'io.metamask' }, metaMask)).toBe(true)
  })

  it('matches a configured connector claiming rdns as a string', () => {
    expect(
      matchesWallet({ id: 'metaMaskSDK', rdns: 'io.metamask' }, metaMask),
    ).toBe(true)
  })

  it('matches a configured connector claiming rdns as an array', () => {
    expect(
      matchesWallet(
        { id: 'metaMaskSDK', rdns: ['io.metamask', 'io.metamask.mobile'] },
        metaMask,
      ),
    ).toBe(true)
  })

  it('rejects a connector with a different rdns', () => {
    expect(
      matchesWallet({ id: 'com.other', rdns: 'com.other' }, metaMask),
    ).toBe(false)
  })

  it('never matches a guide entry without rdns', () => {
    const noRdns = { id: 'x', name: 'X', icon: 'i', downloadUrl: 'd' }
    expect(matchesWallet({ id: 'io.metamask' }, noRdns)).toBe(false)
  })
})
