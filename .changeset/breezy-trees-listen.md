---
"@zerodev/wallet-react-ui": patch
"@zerodev/react-ui": patch
---

fix: stop applying a global CSS reset to the host app

`styles.css` shipped Tailwind's preflight, a global reset that hit every
element on the consumer's page: margins, heading sizes, button chrome, fonts.
All SDK styling now stays inside a `.zd-scope` boundary.

The SDK's CSS is deliberately not wrapped in `@layer`: unlayered author CSS
beats all layered CSS, so the widget styling holds up in a Tailwind host app
regardless of stylesheet import order (a layered version would lose to the
host's preflight whenever the host's layers happen to be declared later).
