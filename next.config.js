/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Suppress Node.js deprecation warnings from dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Suppress url.parse() deprecation warning
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },
  // Suppress deprecation warnings in production
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig


