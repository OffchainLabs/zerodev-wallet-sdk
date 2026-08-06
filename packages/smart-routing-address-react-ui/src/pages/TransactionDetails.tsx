import {
  ArrowCardPair,
  cn,
  DataRow,
  Icon,
  InfoCard,
  Section,
  Text,
  Tooltip,
} from '@zerodev/react-ui'
import { type ReactNode, useState } from 'react'
import { FeeBreakdownRows, FeeSummary } from '../components/FeeBreakdown'
import { FEE_INFO } from '../components/FeeBreakdown/feeInfo'
import { useSmartRoutingAddressContext } from '../context/SmartRoutingAddressContext'
import { useDepositStatus } from '../hooks/useDepositStatus'
import { useProviderFees } from '../hooks/useProviderFees'
import { CHAIN_ICONS, PROVIDER_ICONS, TOKEN_ICONS } from '../iconAssets'
import type { DepositWithTimestamp } from '../types'
import { getTxUrl } from '../utils/chains'
import {
  getSourceTokenSymbol,
  resolveBaseUrl,
  resolveDestChain,
  resolvePollingInterval,
  sourceTokensFromFees,
} from '../utils/config'
import { getDepositStage } from '../utils/deposits'
import { findFeeDataByToken, tokenAddressMatches } from '../utils/fees'
import { formatDisplayAmount, truncateAddress } from '../utils/format'
import { buildFeeBreakdown } from '../utils/providerFees'

export interface TransactionDetailsProps {
  deposit: DepositWithTimestamp
}

/**
 * Poll the deposits list and return the latest snapshot of the deposit
 * matching `initial.deposit.transactionHash`, falling back to `initial` until
 * the first response lands (or if the deposit falls out of the list). Keeps
 * the details view live while the same interval is already running in
 * `Deposit` / `PastDeposits`.
 */
function useLiveDeposit(initial: DepositWithTimestamp): DepositWithTimestamp {
  const { config, addressState } = useSmartRoutingAddressContext()
  const address =
    addressState.status === 'success' ? addressState.address : undefined
  const { deposits } = useDepositStatus({
    address,
    pollingInterval: resolvePollingInterval(config),
    baseUrl: resolveBaseUrl(config),
  })
  const targetHash = initial.deposit.transactionHash
  const live = deposits.find((d) => d.deposit.transactionHash === targetHash) as
    | DepositWithTimestamp
    | undefined
  return live ?? initial
}

/** DOM id shared by the fee-toggle button's `aria-controls` and the panel it
 * opens. Kept as a constant so both sides move together if renamed. */
const FEE_PANEL_ID = 'sra-tx-fee-panel'

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts))
}

/**
 * Transaction details view (Figma `17634:105049`) — token hero pair via
 * `ArrowCardPair` + `InfoCard`, a "Transaction details" `Section` with the
 * route metadata, and a "Transaction Progress" `Section` with the step trail.
 */
export function TransactionDetails({
  deposit: initialDeposit,
}: TransactionDetailsProps) {
  // Re-poll and pick the latest snapshot for this deposit so the details view
  // — Transaction Progress in particular — updates live rather than staying
  // frozen at click-time state.
  const deposit = useLiveDeposit(initialDeposit)
  const { config, addressState, recipient } = useSmartRoutingAddressContext()
  const estimatedFees =
    addressState.status === 'success' ? addressState.estimatedFees : []

  const { chainId, token, amount, transactionHash } = deposit.deposit
  const feeData = findFeeDataByToken(estimatedFees, chainId, token)

  // Match on the on-chain address (via `tokenAddressMatches`) — the server's
  // `feeData.name` is a display symbol (e.g. "ETH"), not the TOKEN_TYPE
  // ("NATIVE"), so a direct name compare would miss native tokens.
  const source =
    sourceTokensFromFees(estimatedFees).find(
      (t) =>
        t.chain.id === chainId &&
        tokenAddressMatches(t.tokenType, chainId, token),
    ) ?? null
  const sourceSymbol = source ? getSourceTokenSymbol(source) : ''
  const sourceChain = source?.chain
  const sourceTokenLogo = sourceSymbol
    ? TOKEN_ICONS[sourceSymbol.toUpperCase()]
    : undefined
  const sourceChainLogo = CHAIN_ICONS[chainId]

  const destChain = resolveDestChain(config)
  // Widget's default actions forward the deposited token, so destination
  // token = source token — reuse the source logo.
  const destTokenLogo = sourceTokenLogo
  const destChainLogo = CHAIN_ICONS[destChain.id]

  const stage = getDepositStage(deposit)
  const execution = deposit.execution
  const outAmountRaw = execution?.outputAmount
  const failed = stage === 'failed'

  // Headline reads as "how much you sent" — round down so we never overstate
  // the deposit. `formatDisplayAmount` (magnitude-aware) also prevents the
  // 18-decimal fractional tail that `formatTokenAmount` produces for ETH.
  const sourceHeadline = feeData
    ? `${formatDisplayAmount(amount, feeData.decimal, 'down')} ${sourceSymbol}`
    : String(amount)

  // NOTE: `feeData.decimal` is the source token's decimals — the SRA fee
  // estimates don't include destination-token decimals, so this is an
  // approximation that only reads correctly when source and destination
  // decimals match. Fixing this properly needs a dest-decimals lookup and
  // is out of scope here.
  //
  // Destination uses `'nearest'` rounding — the server returns the actual
  // on-chain amount after fees + slippage (e.g. 249.9996), and users read
  // this as "how much I received", so rounding to 250.00 is intuitive.
  const destHeadline =
    outAmountRaw && feeData
      ? `${formatDisplayAmount(outAmountRaw, feeData.decimal, 'nearest')} ${sourceSymbol}`
      : '—'

  // `getTxUrl` looks up the chain independently of whether `source` was
  // resolved above — a deposit on a known chain still gets a link even if
  // its token wasn't matched via `sourceTokensFromFees`.
  const sourceHref = getTxUrl(chainId, transactionHash)
  const destHref = execution
    ? getTxUrl(destChain.id, execution.transactionHash)
    : undefined

  // Refetch current Across / Relay quotes for the same route so the "Routing"
  // step can show which provider was used. The historic provider isn't
  // stored server-side; the assumption is the route hasn't changed materially
  // and current quotes still name the same winning provider.
  const providerFees = useProviderFees(source, destChain, feeData, recipient)
  const breakdown =
    feeData && sourceSymbol
      ? buildFeeBreakdown(feeData, sourceSymbol, providerFees.fees)
      : null
  const [feeOpen, setFeeOpen] = useState(false)

  const date = formatDate(deposit.createdAt)

  return (
    // No `h-full` — the page takes its natural content height so the
    // Screen's scroll container can activate scrolling when the fee
    // breakdown is expanded and content exceeds the viewport.
    <div className="zd:flex zd:w-full zd:flex-col zd:gap-3 zd:pt-4 zd:pb-6">
      <ArrowCardPair
        topCard={
          <InfoCard
            title={sourceHeadline}
            {...(sourceTokenLogo && { imageSource: sourceTokenLogo })}
            {...(sourceChainLogo && { chainIconUrl: sourceChainLogo })}
          />
        }
        bottomCard={
          <InfoCard
            title={destHeadline}
            {...(destTokenLogo && { imageSource: destTokenLogo })}
            {...(destChainLogo && { chainIconUrl: destChainLogo })}
          />
        }
      />

      <Section title="Transaction details">
        <DataRow
          label="From network"
          value={
            <NetworkValue
              name={sourceChain?.name ?? '—'}
              {...(sourceChainLogo && { logoUrl: sourceChainLogo })}
            />
          }
        />
        <DataRow
          label="To network"
          value={
            <NetworkValue
              name={destChain.name}
              {...(destChainLogo && { logoUrl: destChainLogo })}
            />
          }
        />
        {date && <DataRow label="Date" value={date} />}
        {breakdown && (
          <DataRow
            label="Total fee"
            value={<FeeSummary breakdown={breakdown} />}
            info
            infoTooltip={FEE_INFO.estimatedFee}
            trailing={
              <button
                type="button"
                onClick={() => setFeeOpen((prev) => !prev)}
                aria-expanded={feeOpen}
                aria-controls={FEE_PANEL_ID}
                aria-label={feeOpen ? 'Hide fee details' : 'Show fee details'}
                className="zd:inline-flex zd:items-center zd:justify-center zd:cursor-pointer"
              >
                <Icon
                  name={feeOpen ? 'chevronUp' : 'chevronDown'}
                  className="zd:w-3.5 zd:h-3.5 zd:text-greyScale"
                />
              </button>
            }
          />
        )}
        {feeOpen && breakdown && (
          <section id={FEE_PANEL_ID} aria-label="Fee breakdown">
            <FeeBreakdownRows breakdown={breakdown} />
          </section>
        )}
      </Section>

      <Section title="Transaction Progress">
        <ProgressStep
          label="Deposit detected"
          info={FEE_INFO.detected}
          done
          right={
            <TxLink
              label={truncateAddress(transactionHash)}
              href={sourceHref}
            />
          }
        />
        <ProgressStep
          label="Routing"
          info={FEE_INFO.routing}
          // Routing was at least attempted whenever we've left the initial
          // detected stage — including the failed path (failure implies the
          // route was tried), so mark it done there too rather than showing
          // an inert pending circle above the "Failed" row.
          done={stage === 'bridging' || stage === 'completed' || failed}
          right={
            providerFees.loading ? (
              <ProviderChipSkeleton />
            ) : breakdown?.provider ? (
              <ProviderChip provider={breakdown.provider} />
            ) : (
              <StatusText>—</StatusText>
            )
          }
        />
        {failed ? (
          <ProgressStep
            label="Failed"
            info={FEE_INFO.failed}
            done={false}
            failed
            isLast
            right={<StatusText tone="error">Error</StatusText>}
          />
        ) : (
          <ProgressStep
            label="Completed"
            info={FEE_INFO.completed}
            done={stage === 'completed'}
            isLast
            right={
              execution ? (
                <TxLink
                  label={truncateAddress(execution.transactionHash)}
                  href={destHref}
                />
              ) : (
                <StatusText>Pending</StatusText>
              )
            }
          />
        )}
      </Section>
    </div>
  )
}

function NetworkValue({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <span className="zd:inline-flex zd:items-center zd:gap-1.5">
      <Text className="zd:whitespace-nowrap zd:font-medium">{name}</Text>
      {logoUrl && (
        <img src={logoUrl} alt="" className="zd:size-4 zd:rounded-full" />
      )}
    </span>
  )
}

function ProgressStep({
  label,
  info,
  done,
  failed,
  isLast,
  right,
}: {
  label: string
  info?: string | undefined
  done: boolean
  failed?: boolean
  isLast?: boolean
  right?: ReactNode
}) {
  return (
    <div className="zd:relative zd:flex zd:w-full zd:items-start zd:gap-3">
      <div className="zd:flex zd:flex-col zd:items-center zd:pt-0.5">
        <StatusMark done={done} failed={!!failed} />
        {!isLast && (
          <div
            className={cn(
              'zd:mt-1 zd:h-4 zd:w-px',
              done ? 'zd:bg-solarOrange/60' : 'zd:bg-greyScale/20',
            )}
          />
        )}
      </div>
      <div className="zd:flex zd:min-w-0 zd:flex-1 zd:items-center zd:gap-1">
        <Text
          className={cn(
            'zd:whitespace-nowrap',
            failed
              ? 'zd:text-negative'
              : // Mute the label until the step is done so a "Completed" row
                // with an inert open circle doesn't read at full intensity
                // while the flow is still bridging.
                done
                ? 'zd:text-greyScale'
                : 'zd:text-greyScale/50',
          )}
        >
          {label}
        </Text>
        {info && (
          <Tooltip content={info}>
            <button
              type="button"
              aria-label="More info"
              className="zd:inline-flex zd:items-center zd:justify-center zd:cursor-help zd:outline-none zd:bg-transparent"
            >
              <Icon
                name="info"
                className="zd:w-3 zd:h-3 zd:text-greyScale/50"
                aria-hidden
              />
            </button>
          </Tooltip>
        )}
      </div>
      <div className="zd:flex zd:shrink-0 zd:items-center">{right}</div>
    </div>
  )
}

function StatusMark({ done, failed }: { done: boolean; failed: boolean }) {
  if (failed) {
    return (
      <Icon name="warning" className="zd:size-4 zd:text-negative" aria-hidden />
    )
  }
  if (done) {
    return (
      <span className="zd:inline-flex zd:size-4 zd:items-center zd:justify-center zd:rounded-full zd:bg-solarOrange">
        <Icon name="check" className="zd:size-3 zd:text-white" aria-hidden />
      </span>
    )
  }
  return (
    <span className="zd:inline-block zd:size-4 zd:rounded-full zd:border zd:border-greyScale/30" />
  )
}

function TxLink({ label, href }: { label: string; href?: string | undefined }) {
  if (!href) {
    return (
      <span className="zd:inline-flex zd:items-center zd:gap-1 zd:text-body3 zd:text-greyScale">
        {label}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="zd:inline-flex zd:items-center zd:gap-1 zd:text-body3 zd:text-greyScale zd:hover:text-solarOrange"
    >
      {label}
      <Icon
        name="export"
        className="zd:size-3 zd:text-solarOrange"
        aria-hidden
      />
    </a>
  )
}

/** Small right-aligned status text used in `ProgressStep` — dedups the
 * "Pending" / "—" / "Error" placeholders that all share the same size class
 * and only differ by tone. */
function StatusText({
  children,
  tone = 'muted',
}: {
  children: string
  tone?: 'muted' | 'error'
}) {
  return (
    <Text
      className={cn(
        'zd:text-body3',
        tone === 'error' ? 'zd:text-negative' : 'zd:text-greyScale/50',
      )}
    >
      {children}
    </Text>
  )
}

function ProviderChip({ provider }: { provider: string }) {
  const iconUrl = PROVIDER_ICONS[provider]
  return (
    <span
      className="zd:inline-flex zd:items-center zd:gap-1 zd:text-body3 zd:text-greyScale"
      title={`Quoted via ${provider}`}
    >
      {provider}
      {iconUrl && (
        <img
          src={iconUrl}
          alt=""
          aria-hidden
          className="zd:size-3.5 zd:shrink-0 zd:rounded-sm zd:object-cover"
        />
      )}
    </span>
  )
}

/** Skeleton placeholder shown while `useProviderFees` is fetching quotes. */
function ProviderChipSkeleton() {
  return (
    <output
      aria-busy="true"
      aria-label="Loading provider"
      className="zd:block zd:h-4 zd:w-16 zd:rounded-full zd:bg-greyScale/15 zd:animate-skel-pulse"
    />
  )
}
