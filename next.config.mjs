/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  serverExternalPackages: ["pg"],
};
export default nextConfig;
