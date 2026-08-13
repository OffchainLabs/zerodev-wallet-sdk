"use client";

import { FlaskConical } from "lucide-react";

export function SraMockControls() {
  return (
    <div
      className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3"
      data-testid="sra-mock-controls"
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="text-sm font-semibold text-gray-900">
          Deposit simulation
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-800">
          not wired
        </span>
      </div>
      <p className="mt-1.5 text-xs text-gray-600">
        Needs a mocked SRA server to do anything — the widget above is talking
        to the real one. Landing with the mocking layer.
      </p>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-semibold text-gray-700">
          Simulate a deposit
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            data-testid="sra-mock-simulate-received"
            className={BUTTON}
          >
            Simulate deposit (→ received)
          </button>
          <button
            type="button"
            disabled
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
          {PAST_DEPOSIT_ACTIONS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled
              data-testid={`sra-mock-past-${id}`}
              className={id === "clear" ? BUTTON_DANGER : BUTTON}
            >
              {label}
            </button>
          ))}
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
              className="flex cursor-not-allowed items-center gap-2 text-xs text-gray-500"
            >
              <input
                type="checkbox"
                disabled
                checked={false}
                readOnly
                data-testid={`sra-mock-error-${id}`}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-3 flex cursor-not-allowed items-center gap-2 text-xs font-semibold text-gray-500">
        <input
          type="checkbox"
          disabled
          checked={false}
          readOnly
          data-testid="sra-mock-sponsored"
        />
        Sponsored fees
      </label>
    </div>
  );
}

const PAST_DEPOSIT_ACTIONS = [
  ["add", "Add"],
  ["add-failed", "Add failed"],
  ["add-25", "Add 25"],
  ["clear", "Clear"],
] as const;

const ERROR_MODES = [
  ["address-create-failed", "Address creation fails (TC-03)"],
  ["route-not-found", "No routes found (TC-05)"],
  ["polling-failed", "Deposit polling fails"],
] as const;

const BUTTON =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_DANGER =
  "rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50";
