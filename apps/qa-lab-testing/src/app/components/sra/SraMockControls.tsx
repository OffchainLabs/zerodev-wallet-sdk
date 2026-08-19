"use client";

import type { SraErrorMode } from "@mocks/definitions/sra.js";
import { FlaskConical } from "lucide-react";
import { cn } from "../../lib/utils";

export type SraMockActions = {
  /** Inject a deposit that walks pending → bridging → completed. */
  simulateReceived: () => void;
  /** Inject a deposit that walks pending → failed. */
  simulateFailed: () => void;
  addPast: (options: { count: number; failed: boolean }) => void;
  clearDeposits: () => void;
  pickErrorMode: (mode: Exclude<SraErrorMode, "none">) => void;
  toggleSponsored: () => void;
};

export function SraMockControls({
  enabled,
  errorMode,
  sponsored,
  actions,
}: {
  enabled: boolean;
  errorMode: SraErrorMode;
  sponsored: boolean;
  actions: SraMockActions;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-3",
        enabled
          ? "border border-emerald-300 bg-emerald-50/50"
          : "border border-dashed border-amber-300 bg-amber-50/50",
      )}
      data-testid="sra-mock-controls"
      data-enabled={String(enabled)}
    >
      <div className="flex items-center gap-2">
        <FlaskConical
          className={cn(
            "h-4 w-4 shrink-0",
            enabled ? "text-emerald-700" : "text-amber-700",
          )}
        />
        <span className="text-sm font-semibold text-gray-900">
          Deposit simulation
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider",
            enabled
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800",
          )}
        >
          {/* Not "live": the banner above uses that for the real network, and
              the two states must never share a word. */}
          {enabled ? "mocking" : "off"}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-gray-600">
        {enabled
          ? "Driving a mocked SRA server. Nothing here touches a chain."
          : "Turn on “Mock SRA server” above — the widget is talking to the real one."}
      </p>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-semibold text-gray-700">
          Simulate a deposit
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!enabled}
            onClick={actions.simulateReceived}
            data-testid="sra-mock-simulate-received"
            className={BUTTON}
          >
            Simulate deposit (→ received)
          </button>
          <button
            type="button"
            disabled={!enabled}
            onClick={actions.simulateFailed}
            data-testid="sra-mock-simulate-failed"
            className={BUTTON}
          >
            Simulate failed deposit (→ failed)
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-semibold text-gray-700">
          Past deposits
        </div>
        <div className="flex flex-wrap gap-2">
          {PAST_DEPOSIT_ADDS.map(([id, label, count, failed]) => (
            <button
              key={id}
              type="button"
              disabled={!enabled}
              onClick={() => actions.addPast({ count, failed })}
              data-testid={`sra-mock-past-${id}`}
              className={BUTTON}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={!enabled}
            onClick={actions.clearDeposits}
            data-testid="sra-mock-past-clear"
            className={BUTTON_DANGER}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-semibold text-gray-700">
          Error mode
        </div>
        <div className="space-y-1">
          {ERROR_MODES.map(([id, label]) => (
            <label
              key={id}
              className={cn(
                "flex items-center gap-2 text-xs",
                enabled
                  ? "cursor-pointer text-gray-700"
                  : "cursor-not-allowed text-gray-500",
              )}
            >
              <input
                type="checkbox"
                className="enabled:cursor-pointer"
                disabled={!enabled}
                checked={errorMode === id}
                onChange={() => actions.pickErrorMode(id)}
                data-testid={`sra-mock-error-${id}`}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <label
        className={cn(
          "mt-3 flex items-center gap-2 text-xs font-semibold",
          enabled
            ? "cursor-pointer text-gray-700"
            : "cursor-not-allowed text-gray-500",
        )}
      >
        <input
          type="checkbox"
          className="enabled:cursor-pointer"
          disabled={!enabled}
          checked={sponsored}
          onChange={actions.toggleSponsored}
          data-testid="sra-mock-sponsored"
        />
        Sponsored fees
      </label>
    </div>
  );
}

const PAST_DEPOSIT_ADDS = [
  ["add", "Add", 1, false],
  ["add-failed", "Add failed", 1, true],
  ["add-25", "Add 25", 25, false],
] as const;

const ERROR_MODES = [
  ["address-create-failed", "Address creation fails (TC-03)"],
  ["route-not-found", "No routes found (TC-05)"],
  ["polling-failed", "Deposit polling fails"],
] as const satisfies readonly (readonly [
  Exclude<SraErrorMode, "none">,
  string,
])[];

const BUTTON =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors enabled:cursor-pointer enabled:hover:border-gray-400 enabled:hover:bg-gray-100 enabled:active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_DANGER =
  "rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors enabled:cursor-pointer enabled:hover:border-red-400 enabled:hover:bg-red-100 enabled:active:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50";
