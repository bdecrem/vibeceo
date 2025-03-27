/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Ensure we're using the correct output for Netlify
  output: 'standalone',
}

module.exports = nextConfig 