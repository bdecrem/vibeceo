/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Use standalone for Netlify with API routes
  output: 'standalone',
}

module.exports = nextConfig 