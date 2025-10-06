/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    // Limit linting during build to the new music-player entrypoint
    dirs: ['app/music-player'],
  },
  // Add output configuration for Netlify
  // output: 'standalone',  // COMMENTED OUT FOR LOCAL DEV
  // Ensure trailing slashes are handled correctly
  trailingSlash: true
}

module.exports = nextConfig
