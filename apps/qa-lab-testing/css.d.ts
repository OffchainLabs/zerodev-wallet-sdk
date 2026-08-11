/**
 * Types global stylesheet imports (`import "./globals.css"`,
 * `import "@zerodev/wallet-react-ui/styles.css"`).
 *
 * TypeScript strips the `.css` extension and looks for a declaration file, so a
 * stylesheet never resolves as a module — and Next only declares `*.module.css`
 * (CSS Modules), not plain global CSS. `tsc` stays quiet about that by default,
 * but anything running with `noUncheckedSideEffectImports` (TS >= 5.6, and some
 * editors by default) reports TS2307 on every one of these imports.
 *
 * The shorthand form is intentional: these imports exist purely for their side
 * effect, so `any` is all the type system needs.
 */
declare module "*.css";
