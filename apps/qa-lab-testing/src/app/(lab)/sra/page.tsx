import { FeatureHeader } from "../../components/lab/FeatureHeader";
import { SraDepositPanel } from "../../components/sra/SraDepositPanel";

export const dynamic = "force-dynamic";

/**
 * The SRA feature's surface. One test case for now, so it sits on the feature
 * page directly rather than behind an area tab — see the `areas` note in
 * `lib/features.ts`.
 */
export default function SraPage() {
  return (
    <>
      <FeatureHeader featureId="sra">
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Live against the real SRA server: deposit addresses and routes are
          genuine, and anything sent to one moves real funds. Deposit simulation
          is not wired up yet.
        </p>
      </FeatureHeader>

      <div className="mt-4" data-testid="sra-surface">
        <SraDepositPanel />
      </div>
    </>
  );
}
