---
"@zerodev/wallet-react-ui": patch
"@zerodev/react-ui": patch
---

fix: stop applying a global CSS reset to the host app

`styles.css` shipped Tailwind's preflight, a global reset that hit every
element on the consumer's page: margins, heading sizes, button chrome, fonts.
All SDK styling now stays inside a `.zd-scope` boundary.
