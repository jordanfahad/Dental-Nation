import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Linting is intentionally not wired into the build for this scaffold so the
  // type-check (the real correctness gate) is never blocked by style rules.
  // Add eslint-config-next later if a CI lint step is desired (see BUILD_NOTES.md).
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // recharts is a large client-only dep; keep it out of the server bundle graph.
    optimizePackageImports: ['recharts', 'date-fns'],
  },
};

export default nextConfig;
