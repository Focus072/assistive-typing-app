/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow up to 10MB for text content
    },
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  reactStrictMode: true,
  // Turbopack config (Next.js 16 default)
  turbopack: {},
}

module.exports = nextConfig


