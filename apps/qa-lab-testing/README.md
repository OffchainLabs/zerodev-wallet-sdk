# qa-lab-testing

The QA host app for the ZeroDev Wallet SDK — the surface used for **e2e (Playwright) and manual testing**.

Unlike `zerodev-signer-demo` (the customer-facing demo), this app exists purely for testing. It carries no
marketing content.

## Layout

Every feature we ship gets a surface here. Two levels of grouping:

- **Feature** — a product capability (Tx Signing, SRA). One sidebar entry, one route.
- **Area** — a slice of one feature's test surface (Signing, Contracts). One tab, one route.

```
┌──────────────────────────────────────────────────────────────────┐
│  ZeroDev  QA LAB                                  [ Environment ] │
├─────────────────┬────────────────────────────────────────────────┤
│ FEATURES        │  0x1234…abcd ⧉   0.4213 ETH ⟳   [Arb Sep ▾]    │
│  ▸ Tx Signing   │                        [Export] [Logout]        │
│    SRA          ├────────────────────────────────────────────────┤
│                 │  Tx Signing                    ⚠ in progress    │
│                 │  ┌ Signing │ Transactions │ Contracts │ RPC ┐   │
│                 │  │   test cases…                          │    │
└─────────────────┴────────────────────────────────────────────────┘
```

## Routes

| Route                  | Behaviour                                                   |
| ---------------------- | ----------------------------------------------------------- |
| `/`                    | Overview — every feature and its status. Auth gate: renders the `AuthFlow` login when disconnected, swapping in place with no redirect. |
| `/tx-signing/<area>`   | A Tx Signing area: `signing`｜`transactions`｜`contracts`｜`rpc`｜`session`. Unknown area → 404. |
| `/tx-signing`          | Redirects to the first area.                                 |
| `/sra`                 | Placeholder until the SRA PR lands.                          |
| `/verify`              | Magic-link callback. Pushes to `/` once wagmi connects.      |
| `/environment`         | Config diagnostics — a pass/fail table of environment checks. Not auth-gated, so it's reachable before signing in. Never renders the actual values, only whether each condition holds. |

**Deep-link in E2E.** Areas are addressable, so a spec goes straight to its
surface — `page.goto('/tx-signing/contracts')` — instead of clicking through a
path shared with every other spec.

## Adding a feature

1. Add an entry to `src/app/lib/features.ts` (id, name, description, status, areas).
2. Add a page under `src/app/(lab)/<id>/`.

Sidebar, overview card, tabs, routes and test IDs all derive from that entry, so
there's no second place to update. The auth gate lives in `(lab)/layout.tsx`, so
a new page can't ship ungated.

### Shell test IDs

| Test ID | Element |
| --- | --- |
| `lab-sidebar` / `nav-feature-<ID>` | Feature nav; `data-active="true"｜"false"` |
| `lab-main` | Content column |
| `overview` / `overview-feature-<ID>` | Overview page and its cards |
| `feature-<ID>-header` / `feature-<ID>-tabs` | Feature title block and tab bar |
| `feature-<ID>-tab-<AREA>` | One area tab; `data-active` |
| `area-<AREA>` | The rendered test-case stack |
| `status-<STATUS>` | Status chip: `ready`｜`wip`｜`planned` |
| `wallet-strip` | Shared wallet bar |
| `wallet-address` / `wallet-copy-address` / `wallet-explorer-link` | Address controls |
| `wallet-balance` / `wallet-asset-<ETH\|USDC>` / `wallet-refresh-balance` | Balance controls; asset buttons carry `data-selected` |
| `wallet-export-keys` / `wallet-logout` | Wallet actions |
| `sra-placeholder` | SRA holding message |

### `/environment` test IDs

Server-rendered per request, so it reflects the environment the server is
actually running with — not what was inlined at build time.

| Test ID | Element |
| --- | --- |
| `header-home-link` | Logo link back to `/` |
| `header-environment-link` | Header button into `/environment` |
| `env-back-to-lab` | Back link to `/` |
| `env-checks-card` / `env-checks-heading` | Environment checks card |
| `env-table` | The checks table |
| `env-row-<VARIABLE>` | One row, e.g. `env-row-NEXT_PUBLIC_ZERODEV_AA_HOST` |
| `env-<VARIABLE>` | That row's result pill; `data-pass="true"｜"false"` |
| `env-config-card` / `env-config-heading` | Wallet configuration card |
| `env-config-row-<ID>` | A config row, `<ID>` = `chains`｜`transports`｜`auth-methods` |
| `env-config-label-<ID>` | That row's label cell |
| `env-chains` | Chain chips container |
| `env-chain-<CHAIN_ID>` | One chain chip, e.g. `env-chain-421614` |
| `env-transports` | Transport chips container |
| `env-transport-<CHAIN_ID>` | One transport chip; `data-explicit="true"｜"false"` |
| `env-auth-methods` | Auth method chips container |
| `env-auth-method-<METHOD>` | One method chip, e.g. `env-auth-method-passkey` |

Each pill also carries `data-pass="true"|"false"`, so assert on that rather than
the label — the label wording differs per check type (`true`/`false` for
"is set", `staging`/`not staging` for the URL checks).

```ts
await expect(page.getByTestId('env-NEXT_PUBLIC_KMS_PROXY_BASE_URL'))
  .toHaveAttribute('data-pass', 'true')
```

## QA Lab

`src/app/components/testing-lab/` holds the test cases, grouped into five tabs:

- **Signing** — message counter, preset messages, invalid typed data
- **Transactions** — send ETH, high amount, invalid address
- **Contracts** — balances, ERC-20, ERC-721, hello-world
- **RPC** — read methods, `wallet_watchAsset`, chain methods
- **Session** — session expiry

Each test case is self-contained: its own explanation, controls, and inline results. Adding one means
dropping a component into `testing-lab/` and listing it in the relevant tab in `TestingLab.tsx`.

## Running it

```bash
pnpm install                                  # from the repo root
cp .env.example .env                          # then fill in the values
pnpm --filter @zerodev/qa-lab-testing dev     # http://localhost:3002
```

Port **3002** so it can run alongside `zerodev-signer-demo` (3000).

## Note on e2e

`e2e/playwright.config.ts` still boots `zerodev-signer-demo` on 3000. Repointing it here is a follow-up:
`goto('/')` still lands on the login screen, but `post-auth.spec.ts` assumes a `/dashboard` route that
this app doesn't have.
