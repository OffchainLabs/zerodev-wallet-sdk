import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { FeatureHeader } from "../../../components/lab/FeatureHeader";
import { TxSigningArea } from "../../../components/testing-lab/TxSigningArea";
import { isFeatureArea } from "../../../lib/features";

export const dynamic = "force-dynamic";

const FEATURE_ID = "tx-signing";

export default async function TxSigningAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;

  if (!isFeatureArea(FEATURE_ID, area)) notFound();

  return (
    <>
      <FeatureHeader featureId={FEATURE_ID}>
        <div className="mt-3 flex max-w-3xl items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">
            <span className="font-semibold">
              Tx signing (the review popup) isn&apos;t released yet.
            </span>{" "}
            It&apos;s disabled here, so every call runs in{" "}
            <span className="font-semibold">background mode</span>. The
            underlying methods still execute against the wallet, but these cases
            are meant for verifying the confirmation UI once tx signing ships —
            until then, the UI behaviour can&apos;t be verified.
          </p>
        </div>
      </FeatureHeader>

      <div className="mt-4">
        <TxSigningArea areaId={area} />
      </div>
    </>
  );
}
