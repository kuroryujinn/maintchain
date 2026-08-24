// scripts/synthetic-users/types.mjs
// Type definitions for the MaintChain synthetic user E2E harness.
// JavaScript with JSDoc annotations — no TypeScript compilation needed.

/**
 * @typedef {'testnet'} Network
 */

/**
 * @typedef {Object} SyntheticWallet
 * @property {string} syntheticId - Deterministic ID (SYNTH-0001, SYNTH-0002, ...)
 * @property {string} publicKey - Stellar G... public key
 * @property {string} secretKey - Stellar S... secret key (NEVER logged or committed)
 * @property {Network} network - Always 'testnet'
 * @property {string} createdAt - ISO 8601 timestamp
 * @property {boolean} funded - Whether the wallet has been funded via Friendbot
 * @property {number|null} balance - XLM balance (null if not yet checked)
 * @property {string|null} firstName - Indian first name
 * @property {string|null} lastName - Indian surname
 * @property {string|null} fullName - Full Indian name
 */

/**
 * @typedef {Object} WalletsFile
 * @property {Network} network
 * @property {string} generatedAt - ISO 8601 timestamp
 * @property {number} count
 * @property {SyntheticWallet[]} users
 */

/**
 * @typedef {Object} RegistrationResult
 * @property {string} syntheticId
 * @property {string} wallet
 * @property {boolean} registered
 * @property {string|null} registrationTimestamp - ISO 8601
 * @property {string|null} error
 * @property {string|null} userId - Backend user UUID
 */

/**
 * @typedef {Object} RegistrationResultsFile
 * @property {number} total
 * @property {number} successful
 * @property {number} failed
 * @property {RegistrationResult[]} results
 */

/**
 * @typedef {Object} VerificationResult
 * @property {string} syntheticId
 * @property {string} wallet
 * @property {boolean} verified
 * @property {string|null} transactionHash
 * @property {Network} network
 * @property {{ occurred: boolean, amount: string|null, asset: string }} payment
 * @property {string|null} timestamp - ISO 8601
 * @property {string|null} error
 */

/**
 * @typedef {Object} VerificationResultsFile
 * @property {number} total
 * @property {number} successful
 * @property {number} failed
 * @property {VerificationResult[]} results
 */

/**
 * @typedef {Object} VerifiedWalletRecord
 * @property {string} syntheticId
 * @property {string} walletId - Stellar public key
 * @property {string} verificationTx - Transaction hash
 * @property {string|null} paymentTx - Payment transaction hash (if separate)
 * @property {string|null} paymentAmountXlm
 * @property {string} verifiedAt - ISO 8601
 */

/**
 * @typedef {Object} SyntheticConfig
 * @property {number} count - Number of users to generate (default: 50)
 * @property {Network} network - Stellar network
 * @property {string} rpcUrl - Soroban RPC URL
 * @property {string} networkPassphrase - Stellar network passphrase
 * @property {string} backendUrl - MaintChain backend URL
 * @property {string|null} identityRegistryId - IdentityRegistry contract ID
 * @property {string} tmpDir - Path to .tmp directory for state files
 */

export {};
