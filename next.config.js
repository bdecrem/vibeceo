/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Add output configuration for Netlify
  output: 'standalone',
  // Ensure trailing slashes are handled correctly
  trailingSlash: true,
  // Add custom domain configuration
  assetPrefix: 'https://myveo.ai'
}

module.exports = nextConfig 