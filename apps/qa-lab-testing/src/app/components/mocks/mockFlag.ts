/**
 * Whether the in-app mock layer is available at all.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so this is a constant per build and
 * flipping it needs a dev-server restart. Read through this module rather than
 * `process.env` directly so there is one place to change if the gate ever moves.
 */
export const MOCKS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCKS === '1'
