import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `ox@0.14.30` (a transitive dep of `viem`) ships a genuine type error in
  // `tempo/KeyAuthorization.ts` — its `Signed<>` return has `account?`
  // where the target type requires it to be present. `skipLibCheck` doesn't
  // help because ox's `./tempo` export points at the source `.ts`, so
  // Next's build worker type-checks it. Scoped here (the demo) rather than
  // via a workspace-wide `pnpm.overrides`; the demo itself is still typed
  // via `pnpm typecheck`, which runs `tsc --noEmit` with `skipLibCheck` +
  // `node_modules` excluded and doesn't traverse ox.
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
