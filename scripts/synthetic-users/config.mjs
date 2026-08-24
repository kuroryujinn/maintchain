// scripts/synthetic-users/config.mjs
// Configuration for the MaintChain synthetic user E2E harness.
// Reads from environment variables with sensible Testnet defaults.

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @returns {import('./types.mjs').SyntheticConfig}
 */
export function getConfig() {
  const count = parseInt(process.env.SYNTHETIC_COUNT || '50', 10);

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Invalid SYNTHETIC_COUNT: ${process.env.SYNTHETIC_COUNT}`);
  }

  return {
    count,
    network: 'testnet',
    rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    networkPassphrase:
      process.env.SOROBAN_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8081',
    identityRegistryId:
      process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ID ||
      process.env.IDENTITY_REGISTRY_CONTRACT_ID ||
      '',
    tmpDir: resolve(__dirname, '.tmp'),
  };
}

/**
 * Get the paths to all state files in .tmp/
 * @param {string} tmpDir
 */
export function getStatePaths(tmpDir) {
  return {
    wallets: resolve(tmpDir, 'wallets.json'),
    registration: resolve(tmpDir, 'registration-results.json'),
    verification: resolve(tmpDir, 'verification-results.json'),
    verifiedWallets: resolve(tmpDir, 'verified-wallets.json'),
  };
}
