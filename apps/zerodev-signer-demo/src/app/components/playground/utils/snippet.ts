import type { EmailAuthMethod } from '@zerodev/wallet-react-ui'

export type UnitType = 'passkey' | 'google' | 'email' | 'divider'

export type PlaygroundItem =
  | { key: string; type: Exclude<UnitType, 'email'> }
  | { key: string; type: 'email'; method: EmailAuthMethod }

/** SignUp page-level knobs, separate from the unit list. */
export type PlaygroundSettings = {
  termsUrl: string
  privacyUrl: string
}

export const DEFAULT_SETTINGS: PlaygroundSettings = {
  termsUrl: '',
  privacyUrl: '',
}

export const UNIT_DEFS: { type: UnitType; label: string; multi: boolean }[] = [
  { type: 'passkey', label: 'Passkey', multi: false },
  { type: 'google', label: 'Google', multi: false },
  { type: 'email', label: 'Email', multi: false },
  { type: 'divider', label: 'Divider', multi: true },
]

export function unitLabel(item: PlaygroundItem): string {
  return UNIT_DEFS.find((d) => d.type === item.type)?.label ?? item.type
}

export function emailMethod(
  items: PlaygroundItem[],
): EmailAuthMethod | undefined {
  for (const i of items) {
    if (i.type === 'email') return i.method
  }
  return undefined
}

// Mirrors the composition hardcoded here before the playground existed — the
// browser E2E specs rely on Passkey and Email being present on first load.
export const DEFAULT_ITEMS: PlaygroundItem[] = [
  { key: 'default-passkey', type: 'passkey' },
  { key: 'default-divider', type: 'divider' },
  { key: 'default-google', type: 'google' },
  { key: 'default-email', type: 'email', method: 'otp' },
]

const UNIT_TAG: Record<UnitType, string> = {
  passkey: 'Passkey',
  google: 'Google',
  email: 'Email',
  divider: 'Divider',
}

export function buildSnippet(
  items: PlaygroundItem[],
  settings: PlaygroundSettings,
): string {
  const head =
    "import { ConnectWallet, SignUp } from '@zerodev/wallet-react-ui'\n\n"
  if (items.length === 0) {
    return `${head}// No renderSignUp — ConnectWallet falls back to <SignUp.Default />.\n<ConnectWallet\n  size="md"\n/>`
  }
  const rootProps: string[] = []
  const method = emailMethod(items)
  if (method) rootProps.push(`emailAuthMethod="${method}"`)
  if (settings.termsUrl) {
    rootProps.push(`termsAndConditionsUrl="${settings.termsUrl}"`)
  }
  if (settings.privacyUrl) {
    rootProps.push(`privacyPolicyUrl="${settings.privacyUrl}"`)
  }
  const signUpOpen =
    rootProps.length === 0
      ? '<SignUp>'
      : rootProps.length === 1
        ? `<SignUp ${rootProps[0]}>`
        : `<SignUp\n      ${rootProps.join('\n      ')}\n    >`
  const units = items
    .map((i) => `      <SignUp.${UNIT_TAG[i.type]} />`)
    .join('\n')
  return `${head}<ConnectWallet\n  size="md"\n  renderSignUp={() => (\n    ${signUpOpen}\n${units}\n    </SignUp>\n  )}\n/>`
}

export type SnippetToken = {
  text: string
  kind: 'plain' | 'comment' | 'string' | 'tag' | 'keyword' | 'attr'
}

const TOKEN_RE =
  /(\/\/[^\n]*)|('[^'\n]*'|"[^"\n]*")|(<\/?[A-Za-z][\w.]*)|(\b(?:import|from)\b)|([a-zA-Z]\w*(?==))/g

export function tokenizeSnippet(code: string): SnippetToken[] {
  const tokens: SnippetToken[] = []
  let last = 0
  for (const match of code.matchAll(TOKEN_RE)) {
    if (match.index > last) {
      tokens.push({ text: code.slice(last, match.index), kind: 'plain' })
    }
    const kind = match[1]
      ? 'comment'
      : match[2]
        ? 'string'
        : match[3]
          ? 'tag'
          : match[4]
            ? 'keyword'
            : 'attr'
    tokens.push({ text: match[0], kind })
    last = match.index + match[0].length
  }
  if (last < code.length) {
    tokens.push({ text: code.slice(last), kind: 'plain' })
  }
  return tokens
}
