---
"@zerodev/wallet-react": patch
---

fix: the expired-session retry storm: useAuthenticators no longer retries 4xx, and an already-expired session is dropped (and re-checked on tab focus) so returning-after-expiry users re-authenticate instead of hammering the backend with a dead key. Adds isClientError / shouldRetryRequest for gating your own QueryClient retries.
