import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorRetryCard } from './index'

const meta: Meta<typeof ErrorRetryCard> = {
  title: 'SmartRoutingAddress/ErrorRetryCard',
  component: ErrorRetryCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 368 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onRetry: { action: 'retry-clicked' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

/** Address creation itself failed — the top-severity retry surface. */
export const AddressCreationFailed: Story = {
  args: {
    message: 'Failed to create deposit address...',
  },
}

/** Creation succeeded but the SRA server returned an empty route list —
 * usually caused by a config that can't be filled right now. */
export const NoRoutesFound: Story = {
  args: {
    message: 'No routes found, try one more time...',
  },
}

/** Deposit polling has been failing after the address was already created. */
export const PollingFailed: Story = {
  args: {
    message: 'Failed to load deposits, try again...',
  },
}

/** Busy variant — icon spins and the button is disabled while a retry is
 * in flight so back-to-back taps can't stack requests. */
export const Busy: Story = {
  args: {
    message: 'Failed to create deposit address...',
    busy: true,
  },
}
