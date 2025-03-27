/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Environment variable enforcement
  env: {
    OPENAI_MODEL: 'gpt-3.5-turbo',
  },
}

module.exports = nextConfig 