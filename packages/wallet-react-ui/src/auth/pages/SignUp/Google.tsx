import { ListItem, ListItemChevron, ListItemIcon } from '@zerodev/react-ui'
import { useAuthenticateOAuth } from '@zerodev/wallet-react'
import { useAuth } from '../../hooks/useAuth'
import { isCancellationError } from '../../utils/isCancellationError'
import { useReportPending, useSignUpContext } from './context'

/** "Google" OAuth row. */
export function SignUpGoogle() {
  const { goToStep } = useAuth()
  const { anyPending, guardAgreement, setError } = useSignUpContext()

  const { mutateAsync: authenticateOAuth, isPending } = useAuthenticateOAuth({
    mutation: {
      onSuccess: () => {
        goToStep('authenticated')
      },
    },
  })
  useReportPending('google', isPending)

  const handleClick = async () => {
    if (!guardAgreement()) return
    setError(null)
    try {
      await authenticateOAuth({ provider: 'google' })
    } catch (err) {
      if (!isCancellationError(err)) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }

  return (
    <ListItem
      icon={<ListItemIcon name="google" />}
      title="Google"
      trailing={<ListItemChevron />}
      disabled={anyPending}
      onClick={handleClick}
    />
  )
}
