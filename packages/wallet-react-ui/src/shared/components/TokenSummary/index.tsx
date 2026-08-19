import { cn, Text, Wrapper } from '@zerodev/react-ui'

export interface TokenSummaryProps {
  /** Token logo URL, shown in the tile floating over the card's top edge.
   * The tile renders empty (neutral background) when omitted. */
  tokenLogoUrl?: string
  /** Pre-formatted fiat value, e.g. `"+$170.27"`. */
  fiatValue: string
  /** Pre-formatted token amount, e.g. `"0.0652 ETH"`. */
  cryptoAmount: string
  className?: string
}

/**
 * Portfolio-value hero (Figma "Portfolio Value", `15873:58532`): a card
 * headed by a token logo tile that overhangs the top edge, with the fiat
 * value large and the crypto amount beneath. The overhang headroom is part
 * of the component, so consumers can stack it without clipping the tile.
 */
export function TokenSummary({
  tokenLogoUrl,
  fiatValue,
  cryptoAmount,
  className,
}: TokenSummaryProps) {
  return (
    <div className={cn('zd:relative zd:w-full zd:pt-7', className)}>
      <Wrapper
        variant="ghost"
        className="zd:flex zd:w-full zd:flex-col zd:items-center zd:gap-2 zd:rounded-2xl zd:px-2 zd:pt-16 zd:pb-2"
      >
        <Text className="zd:whitespace-nowrap zd:text-h1">{fiatValue}</Text>
        <Text className="zd:whitespace-nowrap zd:text-center zd:text-h3">
          {cryptoAmount}
        </Text>
      </Wrapper>
      {/* Token tile — straddles the card's top edge, centred. */}
      <div className="zd:absolute zd:top-0 zd:left-1/2 zd:flex zd:size-18.5 zd:-translate-x-1/2 zd:items-center zd:justify-center zd:rounded-3xl zd:border zd:border-white/20 zd:bg-offWhite/80 zd:backdrop-blur-[15px]">
        {tokenLogoUrl && (
          <img
            src={tokenLogoUrl}
            alt=""
            aria-hidden
            className="zd:size-10.5 zd:object-contain"
          />
        )}
      </div>
    </div>
  )
}
