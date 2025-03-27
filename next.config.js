/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Use serverless for Netlify with API routes
  output: 'serverless',
}

module.exports = nextConfig 