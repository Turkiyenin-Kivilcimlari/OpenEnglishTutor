/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@openenglishttutor/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;