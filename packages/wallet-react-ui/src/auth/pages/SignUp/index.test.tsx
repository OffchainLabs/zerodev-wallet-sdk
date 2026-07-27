/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReportPending, useSignUpContext } from './context'
import { SignUp } from './index'

afterEach(cleanup)

// Units pull in wagmi/wallet-react hooks — replace them with markers so the
// tests exercise only the page logic (composition, registry, guard).
vi.mock('./Passkey', () => ({
  SignUpPasskey: () => <div data-testid="unit-passkey" />,
}))
vi.mock('./Google', () => ({
  SignUpGoogle: () => <div data-testid="unit-google" />,
}))
vi.mock('./Email', () => ({
  SignUpEmail: () => <div data-testid="unit-email" />,
}))

vi.mock('../../components/BlobAnimation', () => ({
  BlobAnimation: () => null,
}))

vi.mock('../../../shared/components/SignUpFooter', () => ({
  SignUpFooter: ({
    setAgreedToTerms,
    highlight,
  }: {
    setAgreedToTerms: (agreed: boolean) => void
    highlight: boolean
  }) => (
    <button
      type="button"
      data-testid="footer-agree"
      data-highlight={String(highlight)}
      onClick={() => setAgreedToTerms(true)}
    >
      agree
    </button>
  ),
}))

/** True when `a` appears before `b` in the document. */
function isBefore(a: Element, b: Element): boolean {
  return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('SignUp.Default', () => {
  it('renders all methods in order with a divider after the passkey group', () => {
    render(<SignUp.Default />)

    const passkey = screen.getByTestId('unit-passkey')
    const divider = screen.getByText('or')
    const google = screen.getByTestId('unit-google')
    const email = screen.getByTestId('unit-email')

    expect(isBefore(passkey, divider)).toBe(true)
    expect(isBefore(divider, google)).toBe(true)
    expect(isBefore(google, email)).toBe(true)
  })
})

function PendingProbe({ pending }: { pending: boolean }) {
  useReportPending('probe', pending)
  return null
}

function AnyPendingReader() {
  const { anyPending } = useSignUpContext()
  return <div data-testid="any-pending">{String(anyPending)}</div>
}

describe('SignUp shared state', () => {
  it('propagates a unit’s pending state to siblings and clears on unmount', () => {
    const { rerender } = render(
      <SignUp>
        <PendingProbe pending />
        <AnyPendingReader />
      </SignUp>,
    )
    expect(screen.getByTestId('any-pending').textContent).toBe('true')

    rerender(
      <SignUp>
        <PendingProbe pending={false} />
        <AnyPendingReader />
      </SignUp>,
    )
    expect(screen.getByTestId('any-pending').textContent).toBe('false')

    rerender(
      <SignUp>
        <PendingProbe pending />
        <AnyPendingReader />
      </SignUp>,
    )
    expect(screen.getByTestId('any-pending').textContent).toBe('true')

    // Unmounting a pending unit must not leave the page locked.
    rerender(
      <SignUp>
        <AnyPendingReader />
      </SignUp>,
    )
    expect(screen.getByTestId('any-pending').textContent).toBe('false')
  })

  it('guardAgreement blocks and highlights until terms are accepted', () => {
    let lastGuardResult: boolean | null = null

    function GuardProbe() {
      const { guardAgreement } = useSignUpContext()
      return (
        <button
          type="button"
          data-testid="guard"
          onClick={() => {
            lastGuardResult = guardAgreement()
          }}
        >
          guard
        </button>
      )
    }

    render(
      <SignUp termsAndConditionsUrl="https://example.com/terms">
        <GuardProbe />
      </SignUp>,
    )

    fireEvent.click(screen.getByTestId('guard'))
    expect(lastGuardResult).toBe(false)
    expect(screen.getByTestId('footer-agree').dataset.highlight).toBe('true')

    fireEvent.click(screen.getByTestId('footer-agree'))
    fireEvent.click(screen.getByTestId('guard'))
    expect(lastGuardResult).toBe(true)
    expect(screen.getByTestId('footer-agree').dataset.highlight).toBe('false')
  })

  it('shows the error takeover and restores content on "Try again"', () => {
    function ErrorProbe() {
      const { setError } = useSignUpContext()
      return (
        <button
          type="button"
          data-testid="fail"
          onClick={() => setError('boom')}
        >
          fail
        </button>
      )
    }

    render(
      <SignUp>
        <ErrorProbe />
      </SignUp>,
    )
    const content = screen.getByText('Continue to your wallet')

    fireEvent.click(screen.getByTestId('fail'))
    expect(screen.getByText('Error occurred')).toBeDefined()
    expect(screen.getByText('boom')).toBeDefined()
    // Content is hidden, not unmounted — unit state survives "Try again".
    expect(content.closest('[class*="zd:hidden"]')).not.toBeNull()

    fireEvent.click(screen.getByText('Try again'))
    expect(screen.queryByText('Error occurred')).toBeNull()
    expect(content.closest('[class*="zd:hidden"]')).toBeNull()
  })
})
