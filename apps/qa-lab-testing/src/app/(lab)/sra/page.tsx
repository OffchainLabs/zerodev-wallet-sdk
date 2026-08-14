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
          Live against the real SRA server by default: deposit addresses and
          routes are genuine, and anything sent to one moves real funds. Turn on{" "}
          <b>Mock SRA server</b> to drive the widget against canned responses
          instead — no network, no funds, and deposits you can step through.
        </p>
      </FeatureHeader>

      <div className="mt-4" data-testid="sra-surface">
        <SraDepositPanel />
      </div>
    </>
  );
}
