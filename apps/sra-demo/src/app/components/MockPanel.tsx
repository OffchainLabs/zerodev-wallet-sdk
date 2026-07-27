'use client'

import { useSmartRoutingAddress } from '@zerodev/smart-routing-address-react-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isAddress, parseUnits } from 'viem'
import { base } from 'viem/chains'
import {
  createSimulation,
  installMockFetch,
  loadPastDeposits,
  type MockStage,
  savePastDeposits,
  setMockDeposits,
  uninstallMockFetch,
} from '../mock'

// Hardcoded simulation: 250 USDC on Base → destination chain from the widget's
// config. Real SRA has to expose the currently-selected picker route for the
// mock to mirror the user's choice; until it does, this is honest enough for
// a "here's what a deposit looks like" preview.
const SOURCE_CHAIN_ID = base.id
const SOURCE_CHAIN_NAME = 'Base'
const TOKEN_SYMBOL = 'USDC'
// USDC on Base
const SOURCE_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const TOKEN_DECIMALS = 6
const AMOUNT_WHOLE = '250'
const FEE_AMOUNT = '250000' // 0.25 USDC

const STEP_LABELS: Record<MockStage, string> = {
  pending: 'Deposit detected — confirming…',
  bridging: 'Routing across chains…',
  completed: 'Sent — track it in the widget.',
}

const DOT_COLOR: Record<'idle' | MockStage, string> = {
  idle: 'bg-muted',
  pending: 'bg-primary animate-mock-pulse',
  bridging: 'bg-primary animate-mock-pulse',
  completed: 'bg-[#6bb04f]',
}

export function MockPanel({ destChainId }: { destChainId: number }) {
  const { addressState } = useSmartRoutingAddress()
  const [sim, setSim] = useState<'idle' | MockStage>('idle')
  const [pasted, setPasted] = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    for (const id of timers.current) clearTimeout(id)
    timers.current = []
  }, [])

  useEffect(() => {
    installMockFetch()
    setMockDeposits(loadPastDeposits())
    return () => {
      clearTimers()
      uninstallMockFetch()
    }
  }, [clearTimers])

  const address =
    addressState.status === 'success' ? addressState.address : undefined
  const pastedOk =
    isAddress(pasted.trim()) &&
    !!address &&
    pasted.trim().toLowerCase() === address.toLowerCase()
  const running = sim === 'pending' || sim === 'bridging'
  const amountLabel = `${AMOUNT_WHOLE} ${TOKEN_SYMBOL}`

  const simulate = useCallback(() => {
    clearTimers()
    const past = loadPastDeposits()
    const params = {
      sourceChainId: SOURCE_CHAIN_ID,
      token: SOURCE_TOKEN_ADDRESS,
      amount: parseUnits(AMOUNT_WHOLE, TOKEN_DECIMALS).toString(),
      feeAmount: FEE_AMOUNT,
      destChainId,
      // Simulation reuses the source token address on the destination side;
      // the widget only cares that fields resolve, not that this is realistic
      // for every chain.
      outputToken: SOURCE_TOKEN_ADDRESS,
    }
    const { snapshot } = createSimulation(params)

    setMockDeposits([snapshot('pending'), ...past])
    setSim('pending')
    timers.current.push(
      setTimeout(() => {
        setMockDeposits([snapshot('bridging'), ...past])
        setSim('bridging')
      }, 3000),
    )
    timers.current.push(
      setTimeout(() => {
        const settled = [snapshot('completed'), ...past]
        savePastDeposits(settled)
        setMockDeposits(settled)
        setSim('completed')
      }, 6500),
    )
  }, [destChainId, clearTimers])

  const hint = !address
    ? 'Generating your deposit address…'
    : running || sim === 'completed'
      ? STEP_LABELS[sim as MockStage]
      : pasted.trim() === ''
        ? 'Paste the widget address to simulate a deposit.'
        : pastedOk
          ? null
          : "That doesn't match your deposit address."

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-border-warm bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold">Simulated wallet</span>
        <span className="ml-auto rounded-full bg-[#fef1e6] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-primary">
          Simulated
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 rounded-lg bg-[#f7f4ef] px-3.5 py-3">
        <span className="text-[22px] font-bold tabular-nums">
          {AMOUNT_WHOLE}
        </span>
        <span className="text-sm font-semibold text-muted">{TOKEN_SYMBOL}</span>
        <span className="ml-auto text-[13px] text-muted">
          on {SOURCE_CHAIN_NAME}
        </span>
      </div>

      {/* Input row — pastedOk drives a green border via the sibling `<input>`
          selector using `peer` + `peer-data-[ok=true]:` on the border. */}
      <label className="relative flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          To
        </span>
        <input
          className={`rounded-lg border bg-white px-3 py-2.5 pr-8 font-mono text-[13px] outline-primary ${
            pastedOk ? 'border-[#6bb04f]' : 'border-border-warm'
          }`}
          value={pasted}
          onChange={(e) => setPasted(e.target.value.trim())}
          placeholder="Paste your deposit address"
          spellCheck={false}
        />
        {pastedOk && (
          <span
            className="absolute right-2.5 top-[30px] font-bold text-[#6bb04f]"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
      </label>

      <button
        type="button"
        className="cursor-pointer rounded-lg border border-ink bg-ink px-4 py-3 text-sm font-semibold text-white transition-[opacity,background-color] duration-150 hover:not-disabled:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        onClick={simulate}
        disabled={!pastedOk}
      >
        {running ? `Send another ${amountLabel}` : `Send ${amountLabel}`}
      </button>

      {hint && (
        <p className="m-0 flex items-center gap-2 text-[13px] text-muted">
          <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[sim]}`} />
          {hint}
        </p>
      )}
    </div>
  )
}
