import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/.git/**', '**/.next/**', '**/node_modules/**'],
      }
    }

    return config
  },
}

export default nextConfig
