/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only use standalone output for production builds
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    outputFileTracingRoot: process.cwd(),
  })
};

export default nextConfig;
