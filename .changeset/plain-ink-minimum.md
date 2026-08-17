---
'@zerodev/react-ui': patch
---

design: DataRow warning variant keeps label/value in default ink

Per design review, the "Minimum deposit" row no longer renders its label and
value in orange — the warning variant keeps the orange-tinted card, with text
in the standard ink color. Its info icon switches from the filled disc to the
new thin `info-outline` glyph (orange, half opacity).
