"use client";

import {
  createSraMocks,
  type SraErrorMode,
  type SraMockHandle,
} from "@mocks/definitions/sra.js";
import { providerFees } from "@mocks/definitions/providerFees.js";
import {
  installMockFetch,
  uninstallMockFetch,
} from "@mocks/installMockFetch.js";
import {
  SmartRoutingAddress,
  type SmartRoutingAddressConfig,
  SmartRoutingAddressProvider,
} from "@zerodev/smart-routing-address-react-ui";
import { AlertTriangle, FlaskConical, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { arbitrum } from "viem/chains";
import { useAccount } from "wagmi";
import { cn } from "../../lib/utils";
import { type SraMockActions, SraMockControls } from "./SraMockControls";

const TARGET_CHAIN = arbitrum;

const SRA_CONFIG: SmartRoutingAddressConfig = {
  targetChainId: TARGET_CHAIN.id,
};

/**
 * How long a simulated deposit sits in each stage. Longer than the widget's
 * hardcoded 5s poll, so every stage is sampled at least once whatever moment
 * the injection lands on.
 */
const STAGE_MS = 6000;

export function SraDepositPanel() {
  const { address } = useAccount();
  const [open, setOpen] = useState(true);
  const [mockOn, setMockOn] = useState(false);
  const [mockReady, setMockReady] = useState(false);
  const [mockNonce, setMockNonce] = useState(0);
  const [errorMode, setErrorMode] = useState<SraErrorMode>("none");
  const [sponsored, setSponsored] = useState(false);
  const mocks = useRef<SraMockHandle | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => {
    if (!mockOn) return;
    const handle = createSraMocks();
    mocks.current = handle;
    // Passthrough, never "block": this patches fetch for the whole page and
    // the wallet SDK's own traffic has to keep working.
    installMockFetch({
      mocks: [...handle.mocks, ...providerFees],
      unmatched: "passthrough",
    });
    setMockReady(true);
    return () => {
      clearTimers();
      uninstallMockFetch();
      mocks.current = null;
      setMockReady(false);
    };
  }, [mockOn, clearTimers]);

  const remount = useCallback(() => {
    clearTimers();
    setMockNonce((nonce) => nonce + 1);
  }, [clearTimers]);

  const simulate = ({ failed }: { failed: boolean }) => {
    const handle = mocks.current;
    if (!handle) return;
    clearTimers();
    handle.startDeposit();
    timers.current.push(
      setTimeout(
        () => (failed ? handle.fail() : handle.advance("bridging")),
        STAGE_MS,
      ),
    );
    if (!failed) {
      timers.current.push(
        setTimeout(() => handle.advance("completed"), STAGE_MS * 2),
      );
    }
  };

  const actions: SraMockActions = {
    simulateReceived: () => simulate({ failed: false }),
    simulateFailed: () => simulate({ failed: true }),
    addPast: ({ count, failed }) => {
      mocks.current?.addPastDeposits(count, { failed });
      remount();
    },
    clearDeposits: () => {
      mocks.current?.clearDeposits();
      remount();
    },
    pickErrorMode: (mode) => {
      const next = errorMode === mode ? "none" : mode;
      setErrorMode(next);
      mocks.current?.setErrorMode(next);
      remount();
    },
    toggleSponsored: () => {
      const next = !sponsored;
      setSponsored(next);
      mocks.current?.setSponsored(next);
      remount();
    },
  };

  const toggleMock = (next: boolean) => {
    setMockOn(next);
    setErrorMode("none");
    setSponsored(false);
  };

  const mockSettled = mockOn === mockReady;

  return (
    <div
      className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="sra-deposit-panel"
      data-mock={mockOn ? "on" : "off"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Deposit funds
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The <code>SmartRoutingAddress</code> widget, with the connected
            wallet as the deposit recipient. Funds settle on {TARGET_CHAIN.name}{" "}
            (chain {TARGET_CHAIN.id}) regardless of the chain the wallet is on.
          </p>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-700">
            Mock SRA server
          </span>
          <span className="relative inline-flex h-6 w-11 shrink-0">
            <input
              type="checkbox"
              checked={mockOn}
              onChange={(event) => toggleMock(event.target.checked)}
              data-testid="sra-mock-toggle"
              className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none h-6 w-11 rounded-full transition-colors",
                "after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5",
                "after:rounded-full after:bg-white after:shadow after:transition-transform",
                "bg-red-500 peer-checked:bg-emerald-500 peer-checked:after:translate-x-5",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-gray-950 peer-focus-visible:ring-offset-2",
              )}
            />
          </span>
        </label>
      </div>

      <div
        role="status"
        data-testid="sra-mock-status"
        className={cn(
          "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
          mockOn
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-red-200 bg-red-50 text-red-900",
        )}
      >
        {mockOn ? (
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        )}
        <span>
          {mockOn ? (
            <>
              <b>Mocked — do not send funds.</b> The deposit address below is
              fabricated. Anything sent to it is unrecoverable.
            </>
          ) : (
            <>
              <b>Live network — real funds.</b> The deposit address below is
              genuine, and anything sent to it moves real money.
            </>
          )}
        </span>
      </div>

      <div className="mt-4">
        {!address ? (
          <p className="text-sm text-gray-500" data-testid="sra-no-account">
            Connect a wallet to generate a deposit address.
          </p>
        ) : open ? (
          <SmartRoutingAddressProvider
            key={mockOn ? `mock-${mockNonce}` : "live"}
            config={SRA_CONFIG}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-h-[600px] w-[400px] shrink-0">
                {mockSettled ? (
                  <SmartRoutingAddress
                    recipient={address}
                    onClose={() => setOpen(false)}
                  />
                ) : (
                  <p
                    className="text-sm text-gray-500"
                    data-testid="sra-mock-switching"
                  >
                    Switching mock layer…
                  </p>
                )}
              </div>
              <div className="min-w-64 flex-1">
                <SraMockControls
                  enabled={mockOn}
                  errorMode={errorMode}
                  sponsored={sponsored}
                  actions={actions}
                />
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
