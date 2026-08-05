import { cn, Text } from '@zerodev/react-ui'
import type { DepositedToken } from '@zerodev/smart-routing-address'
import { CHAIN_ICONS, TOKEN_ICONS } from '../../iconAssets'
import type {
  DepositStage,
  DepositWithTimestamp,
  EstimatedFee,
  SmartRoutingAddressConfig,
} from '../../types'
import {
  getDestTokenSymbol,
  getSourceTokenSymbol,
  resolveDestChain,
  sourceTokensFromFees,
} from '../../utils/config'
import { getDepositStage } from '../../utils/deposits'
import { findFeeDataByToken, tokenAddressMatches } from '../../utils/fees'
import {
  formatDisplayAmount,
  formatRelativeTime,
  truncateAddress,
} from '../../utils/format'
import { TxnItem, type TxnStatus } from '../TxnItem'

export interface PendingDepositsProps {
  deposits: DepositedToken[]
  estimatedFees: EstimatedFee[]
  config: SmartRoutingAddressConfig
  /** Fired when a row is tapped — the widget uses this to open the
   * transaction-details view for the selected deposit. When omitted, rows
   * render as static (non-interactive). */
  onSelectDeposit?: (deposit: DepositedToken) => void
  className?: string
}

const STAGE_TO_STATUS: Record<DepositStage, TxnStatus> = {
  pending: 'Detected',
  bridging: 'Routing',
  completed: 'Received',
  failed: 'Failed',
}

export function PendingDeposits({
  deposits,
  estimatedFees,
  config,
  onSelectDeposit,
  className,
}: PendingDepositsProps) {
  if (deposits.length === 0) return null

  const destChain = resolveDestChain(config)
  const destChainLogo = CHAIN_ICONS[destChain.id]

  return (
    <section
      aria-label="Pending deposits"
      className={cn(
        'zd:relative zd:flex zd:w-full zd:flex-col zd:gap-2 zd:overflow-hidden zd:rounded-2xl zd:p-4',
        'zd:border-offWhite zd:border-[0.3px] zd:bg-white/20',
        'zd:shadow-[inset_0_-4px_4px_0_rgba(255,255,255,0.1),inset_0_3px_4px_0_rgba(0,0,0,0.02)]',
        className,
      )}
    >
      <Text className="zd:text-h3">Pending Deposit</Text>
      <ul className="zd:flex zd:w-full zd:flex-col">
        {deposits.map((raw) => {
          const deposit = raw as DepositWithTimestamp
          const { chainId, token, amount, transactionHash } = deposit.deposit
          const feeData = findFeeDataByToken(estimatedFees, chainId, token)

          // Source pair: reconstruct the SourceToken so we can look up its
          // symbol + chain icon the same way the trigger pill does. Matching
          // on the on-chain address (via `tokenAddressMatches`) — the
          // server's `feeData.name` is a display symbol (e.g. "ETH"), not the
          // TOKEN_TYPE ("NATIVE"), so a direct `t.tokenType === name` compare
          // misses native tokens.
          const source =
            sourceTokensFromFees(estimatedFees).find(
              (t) =>
                t.chain.id === chainId &&
                tokenAddressMatches(t.tokenType, chainId, token),
            ) ?? null
          const sourceSymbol = source ? getSourceTokenSymbol(source) : ''
          const sourceTokenLogo = sourceSymbol
            ? TOKEN_ICONS[sourceSymbol.toUpperCase()]
            : undefined
          const sourceChainLogo = CHAIN_ICONS[chainId]

          // Dest symbol mirrors this row's source (widget's default actions
          // forward the deposited token). Consumer overrides via
          // `config.targetTokenSymbol` still win.
          const destSymbol = getDestTokenSymbol(
            config,
            sourceSymbol || undefined,
          )
          const destTokenLogo = destSymbol
            ? TOKEN_ICONS[destSymbol.toUpperCase()]
            : undefined

          const status = STAGE_TO_STATUS[getDepositStage(deposit)]
          const amountLabel = feeData
            ? `${formatDisplayAmount(amount, feeData.decimal, 'down')} ${sourceSymbol}`
            : String(amount)
          const timestamp = deposit.createdAt
            ? (formatRelativeTime(deposit.createdAt) ?? '')
            : ''

          // Block-explorer URL for the source-chain deposit tx. viem's chain
          // objects ship `blockExplorers.default.url`; fall through to
          // omitting `href` when the chain doesn't advertise one.
          const explorerBase = source?.chain.blockExplorers?.default?.url
          const href = explorerBase
            ? `${explorerBase}/tx/${transactionHash}`
            : undefined

          const row = (
            <TxnItem
              amount={amountLabel}
              address={truncateAddress(transactionHash)}
              {...(href && { href })}
              timestamp={timestamp}
              status={status}
              {...(sourceTokenLogo && {
                sourceTokenIconUrl: sourceTokenLogo,
              })}
              {...(sourceChainLogo && {
                sourceChainIconUrl: sourceChainLogo,
              })}
              {...(destTokenLogo && { destTokenIconUrl: destTokenLogo })}
              {...(destChainLogo && { destChainIconUrl: destChainLogo })}
            />
          )

          return (
            <li key={transactionHash}>
              {onSelectDeposit ? (
                // -mx-1 + px-1 + a wider explicit width extend the hover
                // surface 4px past the row content on each side, so the
                // highlight has visible breathing room without shifting the
                // TxnItem's visual position.
                <button
                  type="button"
                  onClick={() => onSelectDeposit(deposit)}
                  className="zd:w-full zd:cursor-pointer zd:rounded-xl zd:px-1 zd:text-left zd:hover:bg-white/30"
                >
                  {row}
                </button>
              ) : (
                row
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
