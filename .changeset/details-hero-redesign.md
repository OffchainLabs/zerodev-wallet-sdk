---
'@zerodev/smart-routing-address-react-ui': patch
---

design: transaction-details page matches Figma 20002:37994

- The source→destination `ArrowCardPair` hero becomes a single delivered
  hero: received amount at 42px over a card with the destination-token mark
  (74px, chain badge) overhanging the top edge. The design's fiat sub-line
  is omitted — SRA fee estimates carry no USD pricing.
- New standalone "From" row card showing the deposited amount with the
  source-token icon.
- Network rows' chain logos bump to 18px.
- Progress steps restyle: 18px marks, done = soft orange disc with an
  orange check (was solid orange with white), connector line at full
  orange.
