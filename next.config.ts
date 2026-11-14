import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SWC is broken on this machine; webpack + WASM is the fallback.
  // Keep cacheComponents off so API routes can fetch Coinbase live.
  cacheComponents: false,
  transpilePackages: [
    "@coinbase/cdp-react",
    "@coinbase/cdp-hooks",
    "@coinbase/cdp-core",
    "@coinbase/cdp-wagmi",
    "@base-org/account",
  ],
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      // MetaMask SDK optional peer — not used in browser wallet connect.
      "@react-native-async-storage/async-storage": false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      encoding: false,
    };
    if (!isServer) {
      config.resolve.conditionNames = [
        "browser",
        "import",
        "module",
        "default",
      ];
    }
    return config;
  },
};

export default nextConfig;
