---
"@zerodev/wallet-core": patch
---

fix: register passkeys as discoverable (resident) credentials so passkey login can find them. register() now sets authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }, matching the username-less login flow (empty allowCredentials).
