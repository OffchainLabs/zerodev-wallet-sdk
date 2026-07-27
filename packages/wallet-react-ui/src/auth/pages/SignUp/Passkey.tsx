import { Button } from '@zerodev/react-ui'
import { useLoginPasskey, useRegisterPasskey } from '@zerodev/wallet-react'
import { useAuth } from '../../hooks/useAuth'
import { isCancellationError } from '../../utils/isCancellationError'
import { useReportPending, useSignUpContext } from './context'

/** "Create a passkey" + "Log in with passkey" buttons. */
export function SignUpPasskey() {
  const { goToStep } = useAuth()
  const { anyPending, guardAgreement, setError } = useSignUpContext()

  const mutation = {
    onSuccess: () => {
      goToStep('authenticated')
    },
    onError: (err: unknown) => {
      if (!isCancellationError(err)) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
  }
  const { mutate: registerPasskey, isPending: isRegisterPending } =
    useRegisterPasskey({ mutation })
  const { mutate: loginPasskey, isPending: isLoginPending } = useLoginPasskey({
    mutation,
  })
  useReportPending('passkey', isRegisterPending || isLoginPending)

  const guarded = (run: () => void) => () => {
    if (anyPending) return
    if (!guardAgreement()) return
    setError(null)
    run()
  }

  return (
    <>
      <Button
        action="secondary"
        text="Create a passkey"
        iconName="key"
        trailIcon
        disabled={anyPending}
        onClick={guarded(() => registerPasskey())}
      />
      <Button
        action="secondary"
        text="Log in with passkey"
        iconName="key"
        trailIcon
        disabled={anyPending}
        onClick={guarded(() => loginPasskey())}
      />
    </>
  )
}
