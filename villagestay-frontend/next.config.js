/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .node files for AI libraries
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });

    // Ignore AI libraries on server side
    if (isServer) {
      config.externals.push({
        '@xenova/transformers': 'commonjs @xenova/transformers',
        'sharp': 'commonjs sharp'
      });
    }

    return config;
  },
  experimental: {
    esmExternals: 'loose'
  }
};

module.exports = nextConfig;