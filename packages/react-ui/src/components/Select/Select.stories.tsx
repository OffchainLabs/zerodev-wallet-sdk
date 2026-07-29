import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Pill } from '../Pill'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectSeparator,
  SelectTrigger,
} from './index'

const TOKENS = [
  { id: 'USDC', symbol: 'USDC' },
  { id: 'WETH', symbol: 'WETH' },
  { id: 'USDT', symbol: 'USDT' },
  { id: 'DAI', symbol: 'DAI' },
  { id: 'WBTC', symbol: 'WBTC' },
] as const

const meta: Meta = {
  title: 'Select',
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 260 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj

/** Default composition: `Pill` trigger via `asChild`, styled panel with
 * plain-text items. Selection state lives on the caller. */
export const Default: Story = {
  render: () => {
    function Controlled() {
      const [value, setValue] = useState<string>('USDC')
      const selected = TOKENS.find((t) => t.id === value) ?? TOKENS[0]
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger asChild>
            <Pill label={selected.symbol} />
          </SelectTrigger>
          <SelectContent align="start">
            {TOKENS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <SelectItemText>{t.symbol}</SelectItemText>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    return <Controlled />
  },
}

/** Wider panel by inline style — trigger stays narrow, panel spans two of it
 * (mirrors the SRA "Send" row pattern). */
export const WidePanel: Story = {
  render: () => {
    function Controlled() {
      const [value, setValue] = useState<string>('USDC')
      const selected = TOKENS.find((t) => t.id === value) ?? TOKENS[0]
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger asChild>
            <Pill label={selected.symbol} />
          </SelectTrigger>
          <SelectContent
            align="start"
            style={{
              width: 'calc(var(--radix-select-trigger-width) * 2 + 4px)',
            }}
          >
            {TOKENS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <SelectItemText>{t.symbol}</SelectItemText>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    return <Controlled />
  },
}

/** Grouped items with `SelectSeparator`. */
export const Grouped: Story = {
  render: () => {
    function Controlled() {
      const [value, setValue] = useState<string>('USDC')
      const selected = TOKENS.find((t) => t.id === value) ?? TOKENS[0]
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger asChild>
            <Pill label={selected.symbol} />
          </SelectTrigger>
          <SelectContent align="start">
            {TOKENS.slice(0, 2).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <SelectItemText>{t.symbol}</SelectItemText>
              </SelectItem>
            ))}
            <SelectSeparator />
            {TOKENS.slice(2).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <SelectItemText>{t.symbol}</SelectItemText>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    return <Controlled />
  },
}

/** Disabled — trigger is non-interactive; the panel never opens. */
export const Disabled: Story = {
  render: () => (
    <Select value="USDC" disabled>
      <SelectTrigger asChild>
        <Pill label="USDC" disabled />
      </SelectTrigger>
      <SelectContent align="start">
        {TOKENS.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <div className="zd:px-3 zd:py-2">
              <SelectItemText>{t.symbol}</SelectItemText>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}
