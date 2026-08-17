"use client";

import {
  SmartRoutingAddress,
  type SmartRoutingAddressConfig,
  SmartRoutingAddressProvider,
} from "@zerodev/smart-routing-address-react-ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { arbitrum } from "viem/chains";
import { useAccount } from "wagmi";
import { SraMockControls } from "./SraMockControls";


const TARGET_CHAIN = arbitrum;

const SRA_CONFIG: SmartRoutingAddressConfig = {
  targetChainId: TARGET_CHAIN.id,
  // Required since @zerodev/smart-routing-address 0.2.6 (no server default).
  slippage: 100,
};

export function SraDepositPanel() {
  const { address } = useAccount();
  const [open, setOpen] = useState(true);

  return (
    <div
      className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="sra-deposit-panel"
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900">Deposit funds</h3>
        <p className="mt-1 text-sm text-gray-500">
          The <code>SmartRoutingAddress</code> widget, with the connected wallet
          as the deposit recipient. Funds settle on {TARGET_CHAIN.name} (chain{" "}
          {TARGET_CHAIN.id}) regardless of the chain the wallet is on.
        </p>
      </div>

      <div className="mt-4">
        {!address ? (
          <p className="text-sm text-gray-500" data-testid="sra-no-account">
            Connect a wallet to generate a deposit address.
          </p>
        ) : open ? (
          <SmartRoutingAddressProvider config={SRA_CONFIG}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="shrink-0">
                <SmartRoutingAddress
                  recipient={address}
                  onClose={() => setOpen(false)}
                />
              </div>
              <div className="min-w-64 flex-1">
                <SraMockControls />
              </div>
            </div>
          </SmartRoutingAddressProvider>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-testid="sra-open-widget"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-950 bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            <Plus className="h-4 w-4" />
            Open deposit widget
          </button>
        )}
      </div>
    </div>
  );
}
