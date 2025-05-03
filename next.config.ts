// next.config.ts
import type { NextConfig } from 'next';
import path from 'path'; // Import path module

// Import next-pwa correctly based on its export type (CommonJS or ES Module)
// CommonJS style (if next-pwa uses module.exports):
// const withPWA = require('next-pwa')({ ... });

// ES Module style (if next-pwa uses export default):
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public', // Destination directory for service worker files
  register: true, // Register the service worker
  skipWaiting: true, // Activate the new service worker immediately
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
  // You can add more Workbox configuration here if needed
});


const nextConfig: NextConfig = {
  reactStrictMode: true, // Recommended for highlighting potential problems
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add experimental features if needed
  // experimental: {
  //   appDir: true, // Already default in newer Next.js versions
  // },
};

// Wrap the Next.js config with the PWA config
export default withPWA(nextConfig);
