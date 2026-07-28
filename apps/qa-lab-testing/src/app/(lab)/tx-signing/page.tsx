import { redirect } from "next/navigation";
import { toURLSearchParams, withConfig } from "../../lib/config-params";
import { areaHref, defaultAreaId, getFeature } from "../../lib/features";

/**
 * `/tx-signing` has no content of its own — send it to the feature's first
 * area, carrying any config params so the redirect doesn't silently drop them.
 */
export default async function TxSigningIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = toURLSearchParams(await searchParams);
  const feature = getFeature("tx-signing");
  const area = feature && defaultAreaId(feature);

  redirect(withConfig(area ? areaHref("tx-signing", area) : "/", params));
}
