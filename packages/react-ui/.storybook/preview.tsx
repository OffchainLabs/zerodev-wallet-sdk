import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/styles.css'

const withCenteredContainer: Decorator = (Story) => (
  // Stories render outside a Screen, so this container carries the zd-scope
  // class the scoped reset applies to.
  <div className="zd-scope zd:min-h-[300px] zd:min-w-[400px] zd:grid zd:place-items-center zd:p-6">
    {/* Wrapper insulates Story from grid alignment — some components
        (e.g. Badge) hard-code `self-start`, which would otherwise
        override `place-items-center`. */}
    <div>
      <Story />
    </div>
  </div>
)

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withCenteredContainer],
}

export default preview
