import { cn, Icon, Text, Wrapper } from '@zerodev/react-ui'
import { Fragment } from 'react'
import { TxHistoryItem } from '../components/TxHistoryItem'
import { MOCK_HISTORY } from '../mocks'
import type { TxHistoryEntry } from '../types'
import { groupByDay } from '../utils/groupByDay'

export interface HistoryProps {
  /** Activity feed, newest anywhere (sorted internally). Defaults to the
   * mock feed until the real activity source lands. */
  entries?: TxHistoryEntry[]
  /** Fired when a row is tapped. Rows are inert when omitted. */
  onSelectEntry?: (entry: TxHistoryEntry) => void
  /** Opens the full history on the ZeroDev Portal. The footer button is
   * hidden when omitted. */
  onViewPortal?: () => void
}

/**
 * Transaction history page (Figma `15873:58582`): day-grouped activity rows
 * inside one card, with a "See Full History on Portal" footer button.
 */
export function History({
  entries = MOCK_HISTORY,
  onSelectEntry,
  onViewPortal,
}: HistoryProps) {
  const groups = groupByDay(entries)

  return (
    <div className="zd:flex zd:h-full zd:w-full zd:flex-col zd:gap-1 zd:pt-2 zd:pb-4">
      <Wrapper
        variant="ghost"
        className="zd:flex zd:w-full zd:flex-1 zd:flex-col zd:gap-1 zd:overflow-y-auto zd:rounded-2xl zd:p-2"
      >
        {groups.map((group) => (
          <Fragment key={group.label}>
            <div className="zd:flex zd:w-full zd:items-center zd:py-2 zd:pr-2">
              <Text className="zd:text-body3">{group.label}</Text>
            </div>
            {group.entries.map((entry) =>
              onSelectEntry ? (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="zd:w-full zd:cursor-pointer zd:text-left"
                >
                  <EntryRow entry={entry} />
                </button>
              ) : (
                <EntryRow key={entry.id} entry={entry} />
              ),
            )}
          </Fragment>
        ))}

        {onViewPortal && (
          <button
            type="button"
            onClick={onViewPortal}
            className={cn(
              'zd:mt-auto zd:flex zd:w-full zd:shrink-0 zd:cursor-pointer zd:items-center zd:justify-center zd:gap-2',
              'zd:rounded-3xl zd:bg-white/50 zd:px-6 zd:py-5 zd:backdrop-blur-[15px]',
            )}
          >
            <Text className="zd:text-body1">See Full History on Portal</Text>
            <Icon
              name="export"
              className="zd:size-3.5 zd:shrink-0"
              aria-hidden
            />
          </button>
        )}
      </Wrapper>
    </div>
  )
}

function EntryRow({ entry }: { entry: TxHistoryEntry }) {
  return (
    <TxHistoryItem
      icon={entry.icon}
      title={entry.title}
      value={entry.value}
      chainName={entry.chainName}
      {...(entry.chainIconUrl && { chainIconUrl: entry.chainIconUrl })}
      {...(entry.destChainName && { destChainName: entry.destChainName })}
      {...(entry.destChainIconUrl && {
        destChainIconUrl: entry.destChainIconUrl,
      })}
      status={entry.status}
    />
  )
}
