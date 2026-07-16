// scripts/deploy-contracts.mjs
// Deploys Soroban smart contracts to Stellar Testnet.
// Prerequisites: WASM files built from contracts/*/
// Run: node scripts/deploy-contracts.mjs
//
// Requires: DEPLOYER_SECRET_KEY env var set to a funded Testnet account secret key.
// Optional: SOROBAN_RPC_URL env var (defaults to https://soroban-testnet.stellar.org)

import { Keypair } from '@stellar/stellar-sdk';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const DEPLOYER_SECRET = process.env.DEPLOYER_SECRET_KEY;

if (!DEPLOYER_SECRET) {
  console.error('ERROR: DEPLOYER_SECRET_KEY environment variable is required.');
  console.error('Set it to the secret key of a funded Stellar Testnet account.');
  process.exit(1);
}

const CONTRACTS = [
  {
    name: 'EquipmentRegistry',
    wasmPath: resolve(__dirname, '../contracts/equipment-registry/target/wasm32-unknown-unknown/release/equipment_registry.wasm'),
  },
  {
    name: 'MaintenanceRecords',
    wasmPath: resolve(__dirname, '../contracts/maintenance-records/target/wasm32-unknown-unknown/release/maintenance_records.wasm'),
  },
  {
    name: 'MultiPartyApproval',
    wasmPath: resolve(__dirname, '../contracts/multi-party-approval/target/wasm32-unknown-unknown/release/multi_party_approval.wasm'),
  },
  {
    name: 'ComplianceAttestation',
    wasmPath: resolve(__dirname, '../contracts/compliance-attestation/target/wasm32-unknown-unknown/release/compliance_attestation.wasm'),
  },
];

async function deployContract(deployerKp, contract) {
  console.log(`\n--- Deploying ${contract.name} ---`);

  if (!existsSync(contract.wasmPath)) {
    console.error(`  SKIP: WASM not found at ${contract.wasmPath}`);
    console.error(`  Build it first:`);
    console.error(`    cd contracts/${contract.name.toLowerCase().replace(/ /g, '-')} && cargo build --target wasm32-unknown-unknown --release`);
    return null;
  }

  const wasm = readFileSync(contract.wasmPath);

  try {
    // Upload WASM blob via Soroban RPC installContractCode
    const installRes = await fetch(`${RPC_URL}/installContractCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_code: wasm.toString('base64'),
        source_account: deployerKp.publicKey(),
      }),
    });

    if (!installRes.ok) {
      const err = await installRes.text();
      throw new Error(`Install failed: ${err}`);
    }

    const installResult = await installRes.json();
    const wasmHash = installResult.hash;
    console.log(`  WASM uploaded, hash: ${wasmHash}`);

    // Deploy contract from WASM hash
    const deployRes = await fetch(`${RPC_URL}/deployContract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wasm_hash: wasmHash,
        source_account: deployerKp.publicKey(),
      }),
    });

    if (!deployRes.ok) {
      const err = await deployRes.text();
      throw new Error(`Deploy failed: ${err}`);
    }

    const deployResult = await deployRes.json();
    const contractId = deployResult.contract_id || deployResult.id;
    console.log(`  Deployed at: ${contractId}`);
    return contractId;
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
    return null;
  }
}

async function main() {
  const deployerKp = Keypair.fromSecret(DEPLOYER_SECRET);

  console.log(`Deploying contracts using account: ${deployerKp.publicKey()}`);
  console.log(`Soroban RPC: ${RPC_URL}`);
  console.log('');

  const results = {};

  for (const contract of CONTRACTS) {
    const contractId = await deployContract(deployerKp, contract);
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

main().catch(console.error);
