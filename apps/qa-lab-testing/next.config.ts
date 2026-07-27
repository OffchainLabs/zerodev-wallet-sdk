import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@zerodev/wallet-react',
    '@zerodev/wallet-react-ui',
    '@zerodev/wallet-core',
  ],
  // Force a single wagmi / @wagmi/core / @tanstack/react-query instance in the
  // bundle. Each exposes state through a React Context (WagmiProvider config,
  // QueryClientProvider client). If two physical copies end up loaded, provider
  // and consumer reference different Contexts and hooks throw (e.g.
  // WagmiProviderNotFoundError, "No QueryClient set"). Duplicates arise
  // whenever the same version resolves under different (optional) peer
  // contexts — the workspace pulls react@19.2.3 through the Expo/RN side and
  // react@19.2.0 through the demo, so pnpm splits @tanstack/react-query into
  // two variants. Aliasing to this app's node_modules pins every import to the
  // same module identity.
  webpack: (config) => {
    // viem's `wagmi/chains` barrel reaches `ox/tempo`, which resolves a
    // dependency from an expression. Webpack flags that as a critical
    // dependency. It's a third-party false positive, and it only surfaces here
    // because /environment is a server component importing the chain list —
    // signer-demo never pulls chains into the server graph, so it stays quiet.
    // Scoped to that one module so real warnings still get through.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/ox\/_esm\/tempo\// },
    ]

    config.resolve.alias = {
      ...config.resolve.alias,
      wagmi: path.resolve(__dirname, 'node_modules/wagmi'),
      '@wagmi/core': path.resolve(__dirname, 'node_modules/@wagmi/core'),
      '@tanstack/react-query': path.resolve(
        __dirname,
        'node_modules/@tanstack/react-query',
      ),
    }
    return config
  },
}

export default nextConfig
