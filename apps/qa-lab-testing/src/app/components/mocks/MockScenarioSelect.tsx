'use client'

import { setMocks } from '@mocks/installMockFetch.js'
import { presets } from '@mocks/presets/index.js'
import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { MOCKS_ENABLED } from './mockFlag'

const OFF = ''

/**
 * Applies one of the shared presets to the installed `fetch` patch.
 *
 * Selection is deliberately limited to the named presets in `@mocks/presets` —
 * no free-form response editing. A mistyped mock that a tester forgets about
 * produces a bug report for something that was never broken; a named scenario
 * stays labelled and reproducible.
 *
 * Rendered in the header rather than the wallet strip because `LabShell` gates
 * everything under `(lab)/` behind auth, and a scenario may need selecting
 * before login.
 */
export function MockScenarioSelect() {
  const [selected, setSelected] = useState<string>(OFF)

  if (!MOCKS_ENABLED) return null

  const apply = (name: string) => {
    setSelected(name)
    setMocks(name === OFF ? [] : presets[name as keyof typeof presets])
  }

  return (
    <label
      className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:inline-flex"
      title="Apply a mock scenario (this build has mocks enabled)"
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span className="sr-only">Mock scenario</span>
      <select
        value={selected}
        onChange={(event) => apply(event.target.value)}
        data-testid="mock-scenario-select"
        data-active={String(selected !== OFF)}
        className="cursor-pointer bg-transparent text-[11px] font-semibold text-amber-900 outline-none"
      >
        <option value={OFF}>mocks off</option>
        {Object.keys(presets).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}
