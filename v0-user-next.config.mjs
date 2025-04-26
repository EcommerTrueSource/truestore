/** @type {import('next').NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    TRUE_CORE_PANEL_URL: process.env.TRUE_CORE_PANEL_URL,
  },
  images: {
    domains: [
      "s3.amazonaws.com",
      "painel-true-core-app-460815276546.us-central1.run.app",
      "anexos.tiny.com.br",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "painel-true-core-app-460815276546.us-central1.run.app",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "anexos.tiny.com.br",
        pathname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.TRUE_CORE_PANEL_URL}/api/:path*`,
      },
    ];
  },
};

export default config;
