/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Stellar SDK wraps sodium-native/require-addon in try/catch and
    // falls back to tweetnacl in the browser. These are Node.js native
    // addons that can't run in the browser. @stellar/stellar-base even
    // declares "sodium-native": false in its package.json browser field.
    //
    // resolve.alias: prevents bundling into client chunks (replaces with
    //                empty module via `false`).
    // module.noParse: prevents webpack from parsing these files at all,
    //                 which eliminates the critical-dependency warnings
    //                 emitted by their dynamic require() calls.
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

    return config;
  },
};

module.exports = nextConfig;
