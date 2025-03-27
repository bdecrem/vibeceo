/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Use export for Netlify
  output: 'export',
}

module.exports = nextConfig 