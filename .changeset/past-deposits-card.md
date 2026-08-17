---
'@zerodev/react-ui': patch
'@zerodev/smart-routing-address-react-ui': patch
---

design: past-deposits row becomes a card (Figma 20002:36111)

The "Past deposits (N)" row on the deposit page is now a ghost-Wrapper card
(16px radius, border/blur/tint, inner shadow) instead of a plain inline row:
new `clock-fill` icon in orange, 18px title, dark chevron. The tappable
variant hovers via `WrappedPressable`.
