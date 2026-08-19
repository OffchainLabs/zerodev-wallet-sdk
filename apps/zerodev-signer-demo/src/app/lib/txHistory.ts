import type { HistoryFeedItem } from "@zerodev/wallet-react-ui";

/**
 * Transport for the zerodev-data-api transaction-history endpoint
 * (Zerion-backed). Mapping to the widget's feed shape lives in the kit
 * (`toTxHistoryEntries` from @zerodev/wallet-react-ui) — this module only
 * owns how THIS app reaches the API.
 */

// Default goes through the Next rewrite (`/data-api/*` → 127.0.0.1:3100, see
// next.config.ts) so the browser fetch stays same-origin — the data-api has
// no CORS layer. Override with an absolute URL to hit an api directly.
const DATA_API_URL = process.env.NEXT_PUBLIC_DATA_API_URL ?? "/data-api";

/**
 * Test-only: a busy mainnet address so the history view has plenty of real
 * Zerion data to render. The demo's own smart wallets are testnet accounts
 * with little/no mainnet activity, so we query this instead of the connected
 * address until testnet support is wired up.
 */
export const TX_HISTORY_TEST_ADDRESS =
  "0x3d280fde2ddb59323c891cf30995e1862510342f";

export async function fetchTxHistory(
  address: string,
): Promise<{ items: HistoryFeedItem[]; next?: string }> {
  const res = await fetch(`${DATA_API_URL}/v1/me/transaction-history`, {
    headers: { "x-wallet-address": address },
  });
  if (!res.ok) {
    throw new Error(`transaction-history failed: ${res.status}`);
  }
  return res.json();
}
