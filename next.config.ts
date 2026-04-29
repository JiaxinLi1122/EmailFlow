import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

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

export default withSentryConfig(nextConfig, {
  org: 'vaxon',
  project: 'emailflowai',

  silent: !process.env.CI,

  widenClientFileUpload: true,

  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
