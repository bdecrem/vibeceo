/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: ['tqniseocczttrfwtpbdr.supabase.co'],
  },
  // Enable output configuration for production deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Ensure trailing slashes are handled correctly
  trailingSlash: true,
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  // Configure environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig