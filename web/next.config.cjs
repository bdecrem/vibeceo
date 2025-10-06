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
  trailingSlash: true
}

module.exports = nextConfig
