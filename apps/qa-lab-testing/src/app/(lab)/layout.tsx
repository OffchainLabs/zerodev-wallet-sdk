import { LabShell } from "../components/lab/LabShell";

/**
 * Wraps every lab route in the shared chrome and auth gate. A route group, so
 * it adds no path segment — `(lab)/page.tsx` is still `/`.
 */
export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LabShell>{children}</LabShell>;
}
