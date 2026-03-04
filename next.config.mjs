/** @type {import("next").NextConfig} */const nextConfig = {  experimental: {    serverActions: true,    serverComponentsExternalPackages: ["pg"],  },};export default nextConfig;
