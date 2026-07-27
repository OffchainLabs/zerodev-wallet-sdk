import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "../components/AppHeader";
import {
  ENABLED_AUTH_METHODS,
  SUPPORTED_CHAINS,
  hasExplicitTransport,
} from "../lib/wallet-config";

export const dynamic = "force-dynamic";

/**
 * A rendered check: whether it passed, and the short label shown in the pill.
 * The label never carries a full value — see `maskStaging`.
 */
type CheckResult = { pass: boolean; label: string };

const isSet = (value?: string): CheckResult => {
  const pass = Boolean(value?.trim());
  return { pass, label: String(pass) };
};

const containsStaging = (value?: string): CheckResult => {
  const pass = Boolean(value?.toLowerCase().includes("staging"));
  return { pass, label: pass ? "staging" : "not staging" };
};

/**
 * Environment diagnostics.
 *
 * Reports whether each variable satisfies its check. Values are only ever
 * shown redacted, so the page stays safe to screenshot into a bug report.
 *
 * Deliberately a server component: `process.env` is read per request, so this
 * reflects the environment the server is actually running with. A client
 * component would show whatever was inlined into the bundle at build time,
 * which goes stale the moment the app is rebuilt or restarted with new values.
 *
 * Each variable must be referenced as a full literal `process.env.NAME` —
 * Next.js replaces those statically, so dynamic lookups like `process.env[name]`
 * would silently read as undefined.
 */
export default function EnvironmentPage() {
  const checks = [
    {
      variable: "NEXT_PUBLIC_ZERODEV_PROJECT_ID",
      result: isSet(process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID),
    },
    {
      variable: "NEXT_PUBLIC_KMS_PROXY_BASE_URL",
      result: containsStaging(process.env.NEXT_PUBLIC_KMS_PROXY_BASE_URL),
    },
    {
      variable: "NEXT_PUBLIC_ZERODEV_AA_HOST",
      result: containsStaging(process.env.NEXT_PUBLIC_ZERODEV_AA_HOST),
    },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader />

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/"
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-warm)] bg-white px-3 text-xs font-semibold text-[#423a32] transition-colors hover:bg-[var(--surface-warm)] hover:text-[var(--ink)] sm:mb-6"
          data-testid="env-back-to-lab"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to QA Lab
        </Link>

        <div
          className="overflow-hidden rounded-lg border border-[var(--border-warm)] bg-white"
          data-testid="env-checks-card"
        >
          <div className="border-b border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 sm:px-6">
            <h1
              className="font-[var(--font-dm-sans)] text-sm font-bold text-[var(--ink)]"
              data-testid="env-checks-heading"
            >
              Environment
            </h1>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Configuration checks for the running server. Values are never
              shown — only whether each condition holds.
            </p>
          </div>

          <table className="w-full border-collapse text-left" data-testid="env-table">
            <thead>
              <tr className="border-b border-[var(--border-warm)]">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] sm:px-6">
                  Variable
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] sm:px-6">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {checks.map(({ variable, result }) => (
                <tr
                  key={variable}
                  className="border-b border-[var(--border-warm)] last:border-b-0"
                  data-testid={`env-row-${variable}`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold break-all text-[var(--ink)] sm:px-6 sm:text-sm">
                    {variable}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-6">
                    <ResultPill result={result} testId={`env-${variable}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          <span className="font-semibold">not staging</span> means the URL
          doesn&apos;t contain the word — production, local, or unset.
        </p>

        <div
          className="mt-6 overflow-hidden rounded-lg border border-[var(--border-warm)] bg-white"
          data-testid="env-config-card"
        >
          <div className="border-b border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-3 sm:px-6">
            <h2
              className="font-[var(--font-dm-sans)] text-sm font-bold text-[var(--ink)]"
              data-testid="env-config-heading"
            >
              Wallet configuration
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Read from the same module the wagmi config uses, so this can&apos;t
              drift from what the app actually runs with.
            </p>
          </div>

          <dl className="divide-y divide-[var(--border-warm)]">
            <ConfigRow id="chains" label="chains">
              {SUPPORTED_CHAINS.map((chain) => (
                <Chip key={chain.id} testId={`env-chain-${chain.id}`}>
                  {chain.name}
                  <span className="text-[var(--muted)]">{chain.id}</span>
                </Chip>
              ))}
            </ConfigRow>

            <ConfigRow id="transports" label="transports">
              {SUPPORTED_CHAINS.map((chain) => {
                const explicit = hasExplicitTransport(chain.id);
                return (
                  <Chip
                    key={chain.id}
                    testId={`env-transport-${chain.id}`}
                    tone={explicit ? "pass" : "neutral"}
                    data-explicit={String(explicit)}
                  >
                    {chain.name}
                    <span className={explicit ? "" : "text-[var(--muted)]"}>
                      {explicit ? "explicit" : "chain default"}
                    </span>
                  </Chip>
                );
              })}
            </ConfigRow>

            <ConfigRow id="auth-methods" label="auth methods">
              {ENABLED_AUTH_METHODS.map((method) => (
                <Chip key={method} testId={`env-auth-method-${method}`}>
                  {method}
                </Chip>
              ))}
            </ConfigRow>
          </dl>
        </div>

        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          <span className="font-semibold">chain default</span> means no RPC
          override is set, so the transport falls back to viem&apos;s public RPC
          for that chain — fine for reads, rate-limited under load.
        </p>
      </div>
    </div>
  );
}

function ConfigRow({
  id,
  label,
  children,
}: {
  /** Slug driving this row's test IDs, e.g. `chains` -> `env-chains`. */
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
      data-testid={`env-config-row-${id}`}
    >
      <dt
        className="font-mono text-xs font-semibold text-[var(--ink)] sm:text-sm"
        data-testid={`env-config-label-${id}`}
      >
        {label}
      </dt>
      <dd
        className="flex flex-wrap gap-1.5 sm:justify-end"
        data-testid={`env-${id}`}
      >
        {children}
      </dd>
    </div>
  );
}

function Chip({
  testId,
  tone = "neutral",
  children,
  ...rest
}: {
  testId: string;
  tone?: "pass" | "neutral";
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold ${
        tone === "pass"
          ? "border-green-100 bg-green-50 text-green-700"
          : "border-[var(--border-warm)] bg-[var(--surface-warm)] text-[var(--ink)]"
      }`}
      {...rest}
    >
      {children}
    </span>
  );
}

function ResultPill({
  result,
  testId,
}: {
  result: CheckResult;
  testId: string;
}) {
  const Icon = result.pass ? Check : X;

  return (
    <span
      data-testid={testId}
      data-pass={String(result.pass)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold ${
        result.pass
          ? "border-green-100 bg-green-50 text-green-700"
          : "border-red-100 bg-red-50 text-red-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {result.label}
    </span>
  );
}
