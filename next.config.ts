import type { NextConfig } from 'next';

/**
 * AI OFFICE — web app settings (Phase 1: empty app, no AI, no database, no Instagram).
 * The app uses its own TypeScript settings (tsconfig.app.json) so the agents'
 * settings in tsconfig.json stay untouched.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    tsconfigPath: 'tsconfig.app.json',
  },
};

export default nextConfig;
