import { ListItem, ListItemChevron, ListItemIcon } from '@zerodev/react-ui'
import { useAuth } from '../../hooks/useAuth'
import { useSignUpContext } from './context'

/** "Continue with a wallet" row — hands off to the wallet-selection step. */
export function SignUpExternalWallet() {
  const { goToStep } = useAuth()
  const { anyPending, guardAgreement } = useSignUpContext()

  const handleClick = () => {
    if (!guardAgreement()) return
    goToStep('wallet-selection')
  }

  return (
    <ListItem
      icon={<ListItemIcon name="walletOutline" />}
      title="Continue with a wallet"
      trailing={<ListItemChevron />}
      disabled={anyPending}
      onClick={handleClick}
    />
  )
}
