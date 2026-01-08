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
    return {
      beforeFiles: [
        // TR-909 drum machine UI
        { source: '/909/ui/tr909', destination: '/909/ui/tr909/index.html' },
        { source: '/909', destination: '/909/ui/tr909/index.html' },
        // TB-303 bass synth UI
        { source: '/303/ui/tb303', destination: '/303/ui/tb303/index.html' },
        { source: '/303', destination: '/303/ui/tb303/index.html' },
        // R9-DS sampler UI
        { source: '/90s/ui/r9ds', destination: '/90s/ui/r9ds/index.html' },
        { source: '/90s', destination: '/90s/ui/r9ds/index.html' },
      ],
    }
  },
}

module.exports = nextConfig
