/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
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


