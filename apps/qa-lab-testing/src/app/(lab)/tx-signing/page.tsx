import { redirect } from "next/navigation";
import { areaHref, defaultAreaId, getFeature } from "../../lib/features";

/**
 * `/tx-signing` has no content of its own — send it to the feature's first
 * area. Only reached by typing the bare path; the nav links straight to an area.
 */
export default function TxSigningIndexPage() {
  const feature = getFeature("tx-signing");
  const area = feature && defaultAreaId(feature);

  redirect(area ? areaHref("tx-signing", area) : "/");
}
