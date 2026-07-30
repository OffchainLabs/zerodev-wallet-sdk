import { Construction } from "lucide-react";
import { FeatureHeader } from "../../components/lab/FeatureHeader";

export const dynamic = "force-dynamic";

/**
 * Placeholder for the SRA feature. The route, nav entry and header already
 * work, so adding the real surface is just dropping test cases in here and
 * listing the areas in `lib/features.ts` — the shell needs no changes.
 */
export default function SraPage() {
  return (
    <>
      <FeatureHeader featureId="sra" />

      <div
        className="mt-4 flex max-w-3xl items-center justify-center gap-2.5 rounded-lg border border-dashed border-[var(--border-warm)] bg-[var(--surface-warm)] px-4 py-10"
        data-testid="sra-placeholder"
      >
        <Construction className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          To be implemented
        </p>
      </div>
    </>
  );
}