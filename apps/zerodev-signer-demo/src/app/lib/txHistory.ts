import type { TxHistoryEntry } from "@zerodev/wallet-react-ui";

/**
 * Test-only client for the zerodev-data-api transaction-history endpoint
 * (Zerion-backed). Lives in the demo, not the SDK, on purpose: the API
 * contract is still settling, and the kit's `TxHistory` takes `entries` as
 * a prop precisely so hosts own the data source. When the contract
 * stabilizes this module is the spec for a real `useTxHistory` hook.
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

// Minimal mirror of the data-api v1 contract — only the fields this mapper
// reads (the server strips everything else through its zod serializer).
type ApiQuantity = { float: number; numeric: string };
type ApiToken = { symbol: string; chainId: number; imageUri?: string };
type ApiTransaction = {
  id: string;
  operation: string;
  status: "pending" | "success" | "failed";
  chainId: number;
  token?: ApiToken;
  quantity?: ApiQuantity;
  destToken?: ApiToken;
  destQuantity?: ApiQuantity;
  nft?: { tokenId: string; name: string; imageUri?: string };
  /** Unix SECONDS (Zerion convention) — convert to ms for the UI. */
  timestamp: number;
  txHash: `0x${string}`;
};
type ApiUnparsed = { kind: "unparsed"; txHash: string };
type ApiHistoryResponse = {
  items: (ApiTransaction | ApiUnparsed)[];
  next?: string;
};

export async function fetchTxHistory(
  address: string,
): Promise<ApiHistoryResponse> {
  const res = await fetch(`${DATA_API_URL}/v1/me/transaction-history`, {
    headers: { "x-wallet-address": address },
  });
  if (!res.ok) {
    throw new Error(`transaction-history failed: ${res.status}`);
  }
  return res.json();
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "OP Mainnet",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  11155111: "Sepolia",
  421614: "Arbitrum Sepolia",
};

const chainName = (id: number) => CHAIN_NAMES[id] ?? `Chain ${id}`;

/** Past-tense row titles per operation; fallback capitalizes the raw value. */
const OPERATION_VERBS: Record<string, string> = {
  approve: "Approved",
  bid: "Bid on",
  burn: "Burned",
  claim: "Claimed",
  delegate: "Delegated",
  deploy: "Deployed contract",
  deposit: "Deposited",
  execute: "Executed",
  mint: "Minted",
  receive: "Received",
  revoke: "Revoked",
  revoke_delegation: "Revoked delegation",
  send: "Sent",
  swap: "Swapped",
  withdraw: "Withdrew",
  other: "Transaction",
};

const OPERATION_ICONS: Record<string, TxHistoryEntry["icon"]> = {
  swap: "arrowSwapHorizontalOutline",
  mint: "imageFill",
  claim: "lighting",
  deposit: "lighting",
  withdraw: "lighting",
};

function formatAmount(quantity: ApiQuantity): string {
  return quantity.float.toLocaleString("en-US", {
    maximumSignificantDigits: 6,
  });
}

function toEntry(tx: ApiTransaction): TxHistoryEntry {
  const verb =
    OPERATION_VERBS[tx.operation] ??
    tx.operation.charAt(0).toUpperCase() + tx.operation.slice(1);

  const title =
    tx.operation === "swap" && tx.token && tx.destToken
      ? `Swapped ${tx.token.symbol} → ${tx.destToken.symbol}`
      : tx.nft
        ? `${verb} NFT`
        : tx.token
          ? `${verb} ${tx.token.symbol}`
          : verb;

  const value = tx.nft
    ? tx.nft.name
    : tx.quantity && tx.token
      ? `${formatAmount(tx.quantity)} ${tx.token.symbol}`
      : "";

  const destChainId = tx.destToken?.chainId;
  const crossChain = destChainId !== undefined && destChainId !== tx.chainId;

  return {
    id: tx.id,
    icon: tx.nft ? "imageFill" : (OPERATION_ICONS[tx.operation] ?? "transaction"),
    title,
    value,
    chainName: chainName(tx.chainId),
    ...(crossChain && { destChainName: chainName(destChainId) }),
    status:
      tx.status === "pending"
        ? "Pending"
        : tx.status === "failed"
          ? "Failed"
          : "Success",
    timestamp: tx.timestamp * 1000, // API sends unix seconds
  };
}

/**
 * Maps the API page to the kit's feed shape. `unparsed` fallback items
 * (failed ingress validation server-side) are dropped for this test spike —
 * a placeholder row design is an open question.
 */
export function toTxHistoryEntries(
  items: ApiHistoryResponse["items"],
): TxHistoryEntry[] {
  return items
    .filter((item): item is ApiTransaction => !("kind" in item))
    .map(toEntry);
}
