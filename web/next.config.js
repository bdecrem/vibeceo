import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Transpile three.js and react-three packages to fix bundling issues
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  // Webpack config for three.js
  webpack: (config, { isServer }) => {
    // Fix for three.js and R3F
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': require.resolve('three'),
      };
    }
    return config;
  },
  // Ensure trailing slashes are handled correctly
  trailingSlash: true,
  // Rewrites for static HTML apps in public/
  async rewrites() {
    return {
      beforeFiles: [
        // TR-909 drum machine UI
        { source: '/909/ui/tr909', destination: '/909/ui/tr909/index.html' },
        { source: '/909', destination: '/909/ui/tr909/index.html' },
        // TB-303 bass synth UI
        { source: '/303/ui/tb303', destination: '/303/ui/tb303/index.html' },
        { source: '/303', destination: '/303/ui/tb303/index.html' },
        // R9-DS sampler UI
        { source: '/90s/ui/r9ds', destination: '/90s/ui/r9ds/index.html' },
        { source: '/90s', destination: '/90s/ui/r9ds/index.html' },
        // JB01 kick synth UI
        { source: '/jb01/ui/jb01', destination: '/jb01/ui/jb01/index.html' },
        { source: '/jb01', destination: '/jb01/ui/jb01/index.html' },
        // JB200 bass monosynth UI
        { source: '/jb200/ui/jb200', destination: '/jb200/ui/jb200/index.html' },
        { source: '/jb200', destination: '/jb200/ui/jb200/index.html' },
      ],
    }
  },
}

export default nextConfig
