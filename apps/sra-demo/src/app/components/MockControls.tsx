'use client'

import { useSmartRoutingAddress } from '@zerodev/smart-routing-address-react-ui'
import {
  buildMockDeposits,
  clearMockDeposits,
  insertMockDeposits,
  type MockSimulationParams,
  setMockErrorMode,
  setMockSponsored,
  simParamsFromRoute,
} from '../mock'

/**
 * Developer-only controls for exercising the widget against mock data and
 * error states without sending real funds: seed / clear "Past deposits",
 * and preview the "Route not found" and sponsored-fee states.
 *
 * `regenerate` bumps the demo's SRA provider key so any freshly-inserted
 * deposits re-baseline as "past" — the widget only treats deposits seen
 * after mount as active/in-flight — and so error-mode / sponsored toggles
 * take effect immediately.
 */
export function MockControls({
  destChainId,
  regenerate,
  routeError,
  setRouteError,
  sponsored,
  setSponsored,
}: {
  destChainId: number
  regenerate: () => void
  /** Toggle state lifted to the demo root so it survives widget re-mounts.
   * The `set*` handlers also update the mock's module-level state via
   * `setMockErrorMode` / `setMockSponsored`. */
  routeError: boolean
  setRouteError: (value: boolean) => void
  sponsored: boolean
  setSponsored: (value: boolean) => void
}) {
  const { activeRoute } = useSmartRoutingAddress()

  const routeParams = (): MockSimulationParams | null =>
    activeRoute
      ? simParamsFromRoute(
          {
            sourceChainId: activeRoute.sourceChainId,
            token: activeRoute.token,
            decimals: activeRoute.decimals,
            feeAmount: activeRoute.feeAmount,
          },
          destChainId,
        )
      : null

  const insert = (count: number, failed = false) => {
    const params = routeParams()
    if (!params) return
    insertMockDeposits(buildMockDeposits(params, count, { failed }))
    regenerate()
  }

  const clearAll = () => {
    clearMockDeposits()
    regenerate()
  }

  const toggleRouteError = () => {
    const next = !routeError
    setRouteError(next)
    setMockErrorMode(next ? 'route-not-found' : 'none')
    regenerate()
  }

  const toggleSponsored = () => {
    const next = !sponsored
    setSponsored(next)
    setMockSponsored(next)
    regenerate()
  }

  // Orange-tinted border + warm cream background — matches the reference's
  // `pg__dev` panel; visually distinguishes the developer controls from the
  // wallet card above without being obtrusive.
  return (
    <details
      className="group mt-2 overflow-hidden rounded-xl border border-[rgba(242,108,26,0.28)] bg-[rgba(255,250,245,0.6)]"
      open
    >
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-[13px] text-sm font-semibold text-ink group-open:border-b group-open:border-border-warm">
        Mock controls
        <span className="rounded-full bg-[rgba(242,108,26,0.15)] px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-primary">
          Active
        </span>
        <span className="ml-auto text-lg text-muted transition-transform duration-150 group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="flex flex-col gap-5 px-[18px] pt-4 pb-[18px]">
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold">Past deposits</span>
            <span className="text-xs text-muted">
              Seed mock history to test the list &amp; pagination.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <MockBtn onClick={() => insert(1)}>Add deposit</MockBtn>
            <MockBtn onClick={() => insert(25)}>Add 25 (paginate)</MockBtn>
            <MockBtn onClick={() => insert(1, true)}>Add failed</MockBtn>
            <MockBtn onClick={clearAll} danger>
              Clear all
            </MockBtn>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold">Simulate states</span>
            <span className="text-xs text-muted">
              Preview how the widget surfaces errors &amp; perks.
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={routeError}
              onChange={toggleRouteError}
              className="accent-ink"
            />
            <span>
              <b>Route not found</b> — estimates / bridge quotes fail
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={sponsored}
              onChange={toggleSponsored}
              className="accent-ink"
            />
            <span>
              <b>Sponsored fees</b> — all fees waived (shows the pill)
            </span>
          </label>
          <p className="m-0 text-xs text-muted">
            To preview <b>Failed to deliver</b>, add a failed deposit above and
            open it — it links out to the dashboard.
          </p>
        </section>
      </div>
    </details>
  )
}

function MockBtn({
  children,
  onClick,
  danger,
}: {
  children: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
        danger
          ? 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/15'
          : 'border-border-warm bg-white text-ink hover:bg-white/80'
      }`}
    >
      {children}
    </button>
  )
}
