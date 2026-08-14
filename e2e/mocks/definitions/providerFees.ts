import type { MockRequest } from '../types.js'

/**
 * Mocks the bridge-quote APIs the widget calls alongside the SRA server.
 */

const ACROSS_URL_PATTERN = /^https:\/\/app\.across\.to\/api\/suggested-fees/
const RELAY_URL_PATTERN = /^https:\/\/api\.relay\.link\/quote$/

/** Values are USD strings, as Relay reports them. Distinct so a row showing
 * the wrong leg's amount is visible rather than plausible. */
export const RELAY_FEES_USD = {
  service: '0.34',
  destinationGas: '0.21',
  originGas: '0.12',
} as const

export const RELAY_FILL_TIME_SEC = 30

export const providerFees: MockRequest[] = [
  {
    url: ACROSS_URL_PATTERN,
    method: 'GET',
    // Any non-2xx makes the widget discard the quote instead of rendering it.
    status: 503,
    response: { error: 'Mock: Across unavailable' },
  },
  {
    url: RELAY_URL_PATTERN,
    method: 'POST',
    response: {
      fees: {
        relayerService: { amountUsd: RELAY_FEES_USD.service },
        relayerGas: { amountUsd: RELAY_FEES_USD.destinationGas },
        gas: { amountUsd: RELAY_FEES_USD.originGas },
      },
      details: { timeEstimate: RELAY_FILL_TIME_SEC },
    },
  },
]

export const RELAY_PROVIDER_NAME = 'Relay'
