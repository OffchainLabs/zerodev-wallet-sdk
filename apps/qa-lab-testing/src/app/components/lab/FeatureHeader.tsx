"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import { areaHref, getFeature } from "../../lib/features";
import { StatusChip } from "./LabSidebar";

/**
 * Title block plus area tabs for a feature. Every feature page renders one, so
 * they stay visually interchangeable and E2E gets predictable test IDs.
 *
 * The tabs are links, not local state — an area is addressable, so a spec can
 * `goto('/tx-signing/contracts')` instead of clicking through a shared path
 * that any other test could break.
 *
 * Takes an id and resolves the feature itself rather than accepting the object:
 * the registry carries icon components, which aren't serializable, so passing
 * a feature from a server page into this client component would fail.
 */
export function FeatureHeader({
  featureId,
  children,
}: {
  featureId: string;
  /** Feature-level notes or disclaimers, rendered under the title. */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const feature = getFeature(featureId);

  if (!feature) return null;

  return (
    <div data-testid={`feature-${feature.id}-header`}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-[var(--font-dm-sans)] text-lg font-bold text-[var(--ink)]">
          {feature.name}
        </h1>
        <StatusChip status={feature.status} />
      </div>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        {feature.description}
      </p>

      {children}

      {feature.areas.length > 0 && (
        <nav
          className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--border-warm)]"
          data-testid={`feature-${feature.id}-tabs`}
        >
          {feature.areas.map((area) => {
            const href = areaHref(feature.id, area.id);
            const active = pathname === href;
            const Icon = area.icon;

            return (
              <Link
                key={area.id}
                href={href}
                data-testid={`feature-${feature.id}-tab-${area.id}`}
                data-active={String(active)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
                  active
                    ? "border-[var(--ink)] text-[var(--ink)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {area.name}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
