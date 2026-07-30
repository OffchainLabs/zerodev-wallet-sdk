---
"@zerodev/wallet-react": patch
"@zerodev/wallet-core": patch
---

fix: require a valid, non-zero owner when building the account. The wallet address is now validated before use — `getToken` throws on a missing session token, `toViemAccount` refuses a missing/malformed/zero address, and account derivation re-checks the owner.
