/** @type {import("next").NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pg"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};
export default nextConfig;