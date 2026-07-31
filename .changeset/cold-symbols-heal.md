---
"@zerodev/wallet-react-ui": minor
---

feat: composable sign-up via `<SignUp>` and rename `AuthFlow` → `ConnectWallet`

The auth UI is now assembled by composition instead of connector config. Which
methods appear — and how — is decided by the components you render, not an
`enabledMethods` array.

- `<ConnectWallet>` (was `AuthFlow`) renders the active auth step. New props:
  `renderSignUp` (supply your own `SignUp` composition), `logo` (brand mark in
  the top nav — moved off the connector), plus the existing `size` / `onClose`.
- New `<SignUp>` compound export — the sign-up page as composable units:
  `SignUp.Default` (canonical page), `SignUp.Passkey`, `SignUp.Google`,
  `SignUp.Email`, `SignUp.Divider`. The root owns the consent gate
  (`termsAndConditionsUrl` / `privacyPolicyUrl`) and the email flow
  (`emailAuthMethod`), and disables sibling methods while one is in flight.
- New `EmailAuthMethod` type (`'magicLink' | 'otp'`).
- The sign-up card now fits its content (fewer methods → shorter card) up to
  the standard height.

```tsx
// default page, configured
<ConnectWallet
  logo={<YourLogo />}
  renderSignUp={() => (
    <SignUp.Default emailAuthMethod="otp" termsAndConditionsUrl="…" />
  )}
/>

// or compose your own
<ConnectWallet
  renderSignUp={() => (
    <SignUp emailAuthMethod="otp">
      <SignUp.Google />
      <SignUp.Divider />
      <SignUp.Email />
    </SignUp>
  )}
/>
