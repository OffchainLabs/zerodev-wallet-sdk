'use client'

import {
  SmartRoutingAddress,
  type SmartRoutingAddressConfig,
  SmartRoutingAddressProvider,
} from '@zerodev/smart-routing-address-react-ui'
import { useMemo, useState } from 'react'
import type { Chain } from 'viem'
import { type Address, isAddress } from 'viem'
import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains'
import { MockPanel } from './components/MockPanel'

// Vitalik's address — a valid, well-known target so the widget renders
// immediately without the user typing anything.
const DEFAULT_RECIPIENT: Address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

// Destination chains offered in the "Advanced settings" configurator.
const CHAINS: Chain[] = [arbitrum, base, optimism, polygon, mainnet]

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export default function Home() {
  // Applied config drives the widget. Draft state below is edited freely and
  // only applied (regenerating the routing address) when "Save & regenerate"
  // is clicked.
  const [recipient, setRecipient] = useState<Address>(DEFAULT_RECIPIENT)
  const [targetChainId, setTargetChainId] = useState<number>(arbitrum.id)
  const [slippage, setSlippage] = useState<number>(50)

  const [draftRecipient, setDraftRecipient] =
    useState<string>(DEFAULT_RECIPIENT)
  const [draftChain, setDraftChain] = useState<number>(targetChainId)
  const [draftSlippage, setDraftSlippage] = useState<number>(slippage)

  const draftValid = isAddress(draftRecipient)
  const showError = draftRecipient !== '' && !draftValid
  const dirty =
    draftRecipient !== recipient ||
    draftChain !== targetChainId ||
    draftSlippage !== slippage
  const destChain = CHAINS.find((c) => c.id === draftChain)

  const save = () => {
    if (!draftValid) return
    setRecipient(draftRecipient as Address)
    setTargetChainId(draftChain)
    setSlippage(draftSlippage)
  }

  const config = useMemo<SmartRoutingAddressConfig>(
    () => ({ targetChainId, targetTokenSymbol: 'USDC', slippage }),
    [targetChainId, slippage],
  )

  return (
    <main>
      {/* Key on recipient+chain+slippage so the whole SRA subtree resets
          (including provider state) when the user regenerates — otherwise
          stale addresses can persist across config changes. */}
      <SmartRoutingAddressProvider
        key={`${recipient}-${targetChainId}-${slippage}`}
        config={config}
      >
        {/* Grid uses an arbitrary breakpoint of 900px — Tailwind's default
            `md` (768) is too eager and `lg` (1024) too late for this
            two-column ↔ stacked flip. */}
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-start justify-items-center gap-10 px-8 pt-12 pb-16 min-[900px]:grid-cols-[minmax(0,1fr)_400px] min-[900px]:gap-16 min-[900px]:justify-items-stretch">
          <section className="flex max-w-[480px] flex-col gap-8">
            <header className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9c958c]">
                Interactive demo
              </span>
              <h1 className="m-0 text-[clamp(34px,4vw,48px)] font-bold leading-[1.05] tracking-tight">
                Smart Routing Address UI
              </h1>
              <p className="m-0 max-w-[48ch] text-base leading-[1.6] text-muted">
                A pre-built, customizable React UI for ZeroDev Smart Routing
                Address — the whole deposit flow, ready to drop into your app.
              </p>
              <p className="m-0 max-w-[48ch] text-base leading-[1.6] text-muted">
                Install it, make it your own, and cut the funding friction that
                hurts onboarding conversion.
              </p>
            </header>

            <ol className="m-0 flex list-none flex-col gap-5 p-0">
              <li className="flex items-start gap-4">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white tabular-nums">
                  1
                </span>
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[15px] font-semibold">
                    Choose token &amp; network
                  </span>
                  <span className="text-sm leading-[1.5] text-muted">
                    Fees and arrival time update live as the route changes.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white tabular-nums">
                  2
                </span>
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[15px] font-semibold">
                    Send to the address
                  </span>
                  <span className="text-sm leading-[1.5] text-muted">
                    Copy it into any wallet. Deposits are detected
                    automatically.
                  </span>
                  {/* Simulated wallet — copy the widget's deposit address into
                      the input below and click Send to see a fake deposit flow
                      through the widget's status view. */}
                  <MockPanel destChainId={targetChainId} />
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white tabular-nums">
                  3
                </span>
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[15px] font-semibold">
                    Funds arrive on your chain
                  </span>
                  <span className="text-sm leading-[1.5] text-muted">
                    We swap and bridge in the background, delivering to the
                    target chain in seconds.
                  </span>
                </div>
              </li>
            </ol>

            {/* `group` lets the summary chevron rotate on `[open]` via the
                `group-open:` variant. `<details>` list styles + webkit marker
                are neutralised globally in `globals.css`. */}
            <details className="group overflow-hidden rounded-2xl border border-border-warm bg-white/55">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold">
                Advanced settings
                <span className="text-lg text-muted transition-transform duration-150 group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="flex flex-col gap-[22px] px-5 pt-1 pb-5">
                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between text-sm font-semibold">
                    Delivery address
                  </span>
                  <input
                    value={draftRecipient}
                    onChange={(e) => setDraftRecipient(e.target.value.trim())}
                    placeholder="0x…"
                    spellCheck={false}
                    className="rounded-lg border border-border-warm bg-white px-3.5 py-3 font-mono text-sm text-ink outline-primary data-[invalid=true]:border-danger"
                    data-invalid={showError}
                  />
                  <span
                    className={`text-[13px] ${showError ? 'text-danger' : 'text-muted'}`}
                  >
                    {showError
                      ? 'Not a valid address'
                      : 'Generated deposit addresses route funds to this account.'}
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between text-sm font-semibold">
                    Destination chain
                  </span>
                  <select
                    value={draftChain}
                    onChange={(e) => setDraftChain(Number(e.target.value))}
                    className="rounded-lg border border-border-warm bg-white px-3.5 py-3 text-sm text-ink outline-primary"
                  >
                    {CHAINS.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[13px] text-muted">
                    Where deposits settle, regardless of which chain the funds
                    are sent from.
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between text-sm font-semibold">
                    Max slippage
                    <span className="text-muted tabular-nums">
                      {(draftSlippage / 100).toFixed(2)}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={10}
                    value={draftSlippage}
                    onChange={(e) => setDraftSlippage(Number(e.target.value))}
                    className="w-full accent-ink"
                  />
                  <span className="text-[13px] text-muted">
                    Max price movement tolerated while swapping. Lower protects
                    the price but raises the minimum deposit; higher lowers it.
                  </span>
                </label>

                <div className="flex flex-col gap-1 rounded-2xl border border-border-warm bg-[rgba(231,226,221,0.35)] px-[18px] py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Routing to
                  </span>
                  {draftValid ? (
                    <p className="m-0 text-[15px] leading-[1.5]">
                      <code className="font-mono text-sm">
                        {shortAddress(draftRecipient)}
                      </code>{' '}
                      on <b>{destChain?.name ?? `chain ${draftChain}`}</b>
                    </p>
                  ) : (
                    <p className="m-0 text-[15px] leading-[1.5] text-muted">
                      Enter a valid address to set a destination.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-ink bg-ink px-4 py-3 text-sm font-semibold text-white transition-[opacity,background-color] duration-150 hover:not-disabled:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={save}
                  disabled={!dirty || !draftValid}
                >
                  {dirty ? 'Save & regenerate address' : 'Saved'}
                </button>
              </div>
            </details>
          </section>

          <aside className="justify-self-center min-[900px]:justify-self-end">
            <SmartRoutingAddress
              recipient={recipient}
              onClose={() => {
                /* no-op — this demo has nowhere to navigate to */
              }}
              onHelp={() => {
                /* no-op — surfaces the ? icon in TopNav's left slot */
              }}
            />
          </aside>
        </div>
      </SmartRoutingAddressProvider>
    </main>
  )
}
