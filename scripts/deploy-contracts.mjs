// scripts/deploy-contracts.mjs
// Deploys Soroban smart contracts to Stellar Testnet using the Stellar CLI.
// Prerequisites:
//   - WASM files built: cd contracts && cargo build --target wasm32v1-none --release
//   - Stellar CLI installed: https://github.com/stellar/stellar-cli
//   - DEPLOYER_SECRET_KEY env var set
// Run: node scripts/deploy-contracts.mjs

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { Keypair } from '@stellar/stellar-sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.SOROBAN_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const DEPLOYER_SECRET = process.env.DEPLOYER_SECRET_KEY;
const STELLAR_BINARY = process.env.STELLAR_CLI_PATH || 'stellar';

if (!DEPLOYER_SECRET) {
  console.error('ERROR: DEPLOYER_SECRET_KEY environment variable is required.');
  console.error('Set it to the secret key of a funded Stellar Testnet account.');
  process.exit(1);
}

const CONTRACTS = [
  {
    name: 'EquipmentRegistry',
    wasmPath: resolve(__dirname, '../contracts/target/wasm32v1-none/release/equipment_registry.wasm'),
  },
  {
    name: 'MaintenanceRecords',
    wasmPath: resolve(__dirname, '../contracts/target/wasm32v1-none/release/maintenance_records.wasm'),
  },
  {
    name: 'MultiPartyApproval',
    wasmPath: resolve(__dirname, '../contracts/target/wasm32v1-none/release/multi_party_approval.wasm'),
  },
  {
    name: 'ComplianceAttestation',
    wasmPath: resolve(__dirname, '../contracts/target/wasm32v1-none/release/compliance_attestation.wasm'),
  },
  {
    name: 'IdentityRegistry',
    wasmPath: resolve(__dirname, '../contracts/target/wasm32v1-none/release/identity_registry.wasm'),
  },
];

/// Run a Stellar CLI command with the given args array.
/// Returns stdout trimmed, or throws on nonzero exit.
function runStellar(args) {
  const result = spawnSync(STELLAR_BINARY, args, {
    encoding: 'utf-8',
    timeout: 60_000,
  });

  if (result.error) {
    throw new Error(`CLI spawn error: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || '(no stderr)';
    throw new Error(`CLI exited with status ${result.status}: ${stderr}`);
  }

  return result.stdout.trim();
}

/// Build the base CLI args that are common to all commands.
function baseArgs() {
  return [
    '--source', DEPLOYER_SECRET,
    '--rpc-url', RPC_URL,
    '--network-passphrase', NETWORK_PASSPHRASE,
  ];
}

/// Install WASM and return the hash.
function installWasm(wasmPath) {
  const args = [
    'contract', 'install',
    '--wasm', wasmPath,
    ...baseArgs(),
  ];

  console.log(`  Installing WASM: ${basename(wasmPath)}`);
  const stdout = runStellar(args);
  const hash = stdout.trim();
  if (!hash || hash.length !== 64) {
    throw new Error(`Unexpected install output: "${stdout}"`);
  }
  console.log(`  WASM hash: ${hash}`);
  return hash;
}

/// Deploy a contract from a WASM hash and return the contract ID.
function deployContract(wasmHash) {
  const args = [
    'contract', 'deploy',
    '--wasm-hash', wasmHash,
    ...baseArgs(),
  ];

  console.log(`  Deploying contract from hash: ${wasmHash}`);
  const stdout = runStellar(args);
  const contractId = stdout.trim();
  if (!contractId || contractId.length !== 56) {
    throw new Error(`Unexpected deploy output: "${stdout}"`);
  }
  console.log(`  Contract ID: ${contractId}`);
  return contractId;
}

/// Deploy a single contract: install WASM, then deploy from hash.
function deployOne(contract) {
  console.log(`\n--- Deploying ${contract.name} ---`);

  if (!existsSync(contract.wasmPath)) {
    console.error(`  SKIP: WASM not found at ${contract.wasmPath}`);
    console.error(`  Build it first:`);
    console.error(`    cd contracts && cargo build --target wasm32v1-none --release`);
    return null;
  }

  try {
    const wasmHash = installWasm(contract.wasmPath);
    const contractId = deployContract(wasmHash);
    return contractId;
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
    return null;
  }
}

function main() {
  const deployerKp = Keypair.fromSecret(DEPLOYER_SECRET);
  const publicKey = deployerKp.publicKey();

  console.log(`Deploying contracts using account: ${publicKey}`);
  console.log(`Soroban RPC: ${RPC_URL}`);
  console.log(`Network: ${NETWORK_PASSPHRASE}`);
  console.log('Stellar CLI:', STELLAR_BINARY);
  console.log('');

  const results = {};

  for (const contract of CONTRACTS) {
    const contractId = deployOne(contract);
    if (contractId) {
      results[contract.name] = contractId;
    }
  }

  console.log('\n=== Deployment Results ===');
  console.log(JSON.stringify(results, null, 2));

  // Generate .env.local entries
  console.log('\n=== Add to frontend/.env.local ===');
  for (const [name, id] of Object.entries(results)) {
    if (id) {
      const envName = `NEXT_PUBLIC_${name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_ID`;
      console.log(`${envName}=${id}`);
    }
  }
}

main();
