{// next.config.ts
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
        hostname: 'picsum.photos', // Placeholder images
        port: '',
        pathname: '/**',
      },
       // Add other trusted image hostnames here (e.g., CDN, storage bucket)
       // Example for Cloudinary:
       // {
       //   protocol: 'https',
       //   hostname: 'res.cloudinary.com',
       //   port: '',
       //   pathname: `/${process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name'}/**`, // Use env var for cloud name
       // },
       // Example for AWS S3 (replace with your bucket specifics):
       // {
       //   protocol: 'https',
       //   hostname: 'your-bucket-name.s3.your-region.amazonaws.com',
       //   port: '',
       //   pathname: '/**',
       // },
    ],
  },
  // --- Code Splitting and Lazy Loading ---
  // Next.js automatically does code splitting per page.
  // For component-level splitting, use `next/dynamic`.
  // Example configuration options (usually not needed unless customizing):
  // experimental: {
  //   granularChunks: true, // May help with smaller bundles, experiment if needed
  // },
  // --- End Code Splitting ---
};

// Wrap the Next.js config with the PWA config
export default withPWA(nextConfig);
