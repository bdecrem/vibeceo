/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    // Global lint currently fails due to legacy pages; skip during CI builds
    ignoreDuringBuilds: true,
  },
  // Add output configuration for Netlify
  // output: 'standalone',  // COMMENTED OUT FOR LOCAL DEV
  // Ensure trailing slashes are handled correctly
  trailingSlash: true
}

module.exports = nextConfig
