/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Add output configuration for Netlify
  output: 'standalone',
  // Ensure trailing slashes are handled correctly
  trailingSlash: true
}

export default nextConfig 