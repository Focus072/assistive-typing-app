/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  outputFileTracingIncludes: {
    '/dashboard': ['./app/(dashboard)/**/*'],
  },
}

module.exports = nextConfig


