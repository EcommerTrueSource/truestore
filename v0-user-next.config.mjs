/** @type {import('next').NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://painel-true-core-app-460815276546.us-central1.run.app",
  },
  images: {
    domains: [
      "s3.amazonaws.com",
      "painel-true-core-app-460815276546.us-central1.run.app",
      "storage.googleapis.com",
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
        hostname: "storage.googleapis.com",
        pathname: "**",
      },
    ],
  },
};

export default config;
