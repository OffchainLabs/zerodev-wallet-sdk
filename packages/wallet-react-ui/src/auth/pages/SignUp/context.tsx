import { createContext, useContext, useEffect } from 'react'
import type { AuthMethod, EmailAuthMethod } from '../../types'

export type SignUpContextValue = {
  /** True while any method's auth attempt is in flight — used to disable
   * sibling methods so two flows can't run at once. */
  anyPending: boolean
  /** Which email verification flow the Email unit runs. Set on the root
   * (`<SignUp emailAuthMethod=…>`); already resolved to its default here. */
  emailAuthMethod: EmailAuthMethod
  setPending: (id: AuthMethod, pending: boolean) => void
  /** True when the terms checkbox is required but unchecked. For passive
   * disabled styling; use `guardAgreement` before starting an attempt. */
  needsAgreement: boolean
  /** Call before starting an auth attempt: highlights the terms checkbox and
   * returns false when agreement is required but missing. */
  guardAgreement: () => boolean
  setError: (message: string | null) => void
}

export const SignUpContext = createContext<SignUpContextValue | null>(null)

export function useSignUpContext(): SignUpContextValue {
  const ctx = useContext(SignUpContext)
  if (!ctx) {
    throw new Error('SignUp.* components must be rendered inside <SignUp>')
  }
  return ctx
}

/** Report a method's in-flight state into the shared pending registry.
 * Cleans up on unmount so a removed unit can't leave the page locked. */
export function useReportPending(id: AuthMethod, pending: boolean) {
  const { setPending } = useSignUpContext()
  useEffect(() => {
    setPending(id, pending)
    return () => setPending(id, false)
  }, [id, pending, setPending])
}
