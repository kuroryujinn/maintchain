const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Cache static assets (JS, CSS, images) for 1 year
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes: no cache
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Stellar SDK wraps sodium-native/require-addon in try/catch and
    // falls back to tweetnacl in the browser. These are Node.js native
    // addons that can't run in the browser. @stellar/stellar-base even
    // declares "sodium-native": false in its package.json browser field.
    config.resolve.alias = {
      ...config.resolve.alias,
      'sodium-native': false,
      'require-addon': false,
    };

    config.module.noParse = [
      ...(Array.isArray(config.module.noParse) ? config.module.noParse : []),
      /sodium-native/,
      /require-addon/,
    ];

    // Bundle analyzer (only when ANALYZE=true)
    if (process.env.ANALYZE === 'true' && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: '../bundle-report.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },
};

// GlitchTip is Sentry-compatible — withSentryConfig enables:
// - Automatic source map injection during builds
// - Error tracking instrumentation
// - Performance monitoring
//
// Source maps are uploaded to GlitchTip via glitchtip-cli in CI/CD,
// NOT via the Sentry Webpack Plugin (which requires SENTRY_AUTH_TOKEN).
module.exports = withSentryConfig(nextConfig, {
  silent: !process.env.CI, // Only verbose in CI
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  // Disable the Sentry Webpack Plugin for source map upload —
  // GlitchTip CLI handles this instead.
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
});
