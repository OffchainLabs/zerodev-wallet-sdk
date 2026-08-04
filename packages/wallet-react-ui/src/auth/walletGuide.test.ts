import { describe, expect, it } from 'vitest'
import { matchesWallet, WALLET_GUIDE } from './walletGuide'

const metamask = WALLET_GUIDE.find((w) => w.id === 'metamask')
if (!metamask) throw new Error('metamask missing from WALLET_GUIDE')

describe('matchesWallet', () => {
  it('matches an announced connector by id', () => {
    expect(matchesWallet({ id: 'io.metamask' }, metamask)).toBe(true)
  })

  it('matches a configured connector claiming rdns as a string', () => {
    expect(
      matchesWallet({ id: 'metaMaskSDK', rdns: 'io.metamask' }, metamask),
    ).toBe(true)
  })

  it('matches a configured connector claiming rdns as an array', () => {
    expect(
      matchesWallet(
        { id: 'metaMaskSDK', rdns: ['io.metamask', 'io.metamask.mobile'] },
        metamask,
      ),
    ).toBe(true)
  })

  it('rejects a connector with a different rdns', () => {
    expect(
      matchesWallet({ id: 'com.other', rdns: 'com.other' }, metamask),
    ).toBe(false)
  })

  it('never matches a guide entry without rdns', () => {
    const noRdns = { id: 'x', name: 'X', icon: 'i', downloadUrl: 'd' }
    expect(matchesWallet({ id: 'io.metamask' }, noRdns)).toBe(false)
  })
})
