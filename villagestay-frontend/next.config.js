// villagestay-frontend/next.config.js - Enhanced for offline
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .node files for AI libraries
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });

    // Handle WebLLM specific requirements
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Ignore AI libraries on server side
    if (isServer) {
      config.externals.push({
        '@mlc-ai/web-llm': 'commonjs @mlc-ai/web-llm',
        '@xenova/transformers': 'commonjs @xenova/transformers',
        'sharp': 'commonjs sharp'
      });
    }

    return config;
  },
  experimental: {
    esmExternals: 'loose'
  },
  // Enhanced headers for better offline support
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Special caching for the homepage
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      }
    ];
  },
  // Ensure proper static file handling
  trailingSlash: false,
  generateEtags: false,
  compress: true
};

module.exports = nextConfig;