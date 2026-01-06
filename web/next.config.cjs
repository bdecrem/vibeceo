/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    // Global lint remains noisy; prebuild script handles targeted checks
    ignoreDuringBuilds: true,
  },
  // Add output configuration for Netlify
  // output: 'standalone',  // COMMENTED OUT FOR LOCAL DEV
  // Ensure trailing slashes are handled correctly
  trailingSlash: true,
  // Rewrites for static HTML apps in public/
  async rewrites() {
    return [
      // TR-909 drum machine UI
      {
        source: '/909/ui/tr909',
        destination: '/909/ui/tr909/index.html',
      },
      {
        source: '/909/ui/tr909/',
        destination: '/909/ui/tr909/index.html',
      },
    ]
  },
}

module.exports = nextConfig
