/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        net: false,
        tls: false,
        dns: false,
        util: false
      };
      config.externals = [...(config.externals || []), 'pg', 'pg-native'];
    }
    return config;
  }
}

module.exports = nextConfig
