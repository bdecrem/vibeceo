/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add any external image domains if needed
  },
  // If you need to handle redirects or rewrites
  async redirects() {
    return [
      // Example redirect for the 404 Product Hunt link
      {
        source: '/product-hunt-does-not-exist',
        destination: '/404',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig