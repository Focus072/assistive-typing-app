/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Add empty turbopack config to silence the webpack warning
  // We're using Turbopack (default in Next.js 16) instead of webpack
  turbopack: {},
}

module.exports = nextConfig


