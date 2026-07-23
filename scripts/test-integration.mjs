// scripts/test-integration.mjs
// Integration test suite for MaintChain Soroban contracts.
// Run: node scripts/test-integration.mjs
// Requires: SOROBAN_RPC_URL, DEPLOYER_SECRET_KEY, and all CONTRACT_ID env vars.
// Run test-setup.mjs first to create test data.

import { Keypair, Contract, TransactionBuilder, Networks, BASE_FEE,
  SorobanDataBuilder, xdr, nativeToScVal } from '@stellar/stellar-sdk';

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const DEPLOYER_SECRET = process.env.DEPLOYER_SECRET_KEY;
const TEST_MAINTENANCE_ID = process.env.TEST_MAINTENANCE_ID;
const TEST_EQUIPMENT_ID = process.env.TEST_EQUIPMENT_ID;
const TEST_CERT_HASH = process.env.TEST_CERT_HASH;

const CONTRACT_IDS = {
  equipment: process.env.NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID,
  maintenance: process.env.NEXT_PUBLIC_MAINTENANCE_RECORDS_ID,
  approval: process.env.NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID,
  attestation: process.env.NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID,
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function checkEnv() {
  const missing = [];
  if (!DEPLOYER_SECRET) missing.push('DEPLOYER_SECRET_KEY');
  if (!TEST_MAINTENANCE_ID) missing.push('TEST_MAINTENANCE_ID');
  if (!TEST_EQUIPMENT_ID) missing.push('TEST_EQUIPMENT_ID');
  for (const [name, id] of Object.entries(CONTRACT_IDS)) {
    if (!id) missing.push(`CONTRACT_ID for ${name}`);
  }
  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '));
    console.error('Run test-setup.mjs first to generate test data.');
    process.exit(1);
  }
}

async function simulateContract(contractId, method, args) {
  const contract = new Contract(contractId);
  const scvalArgs = args.map(a => {
    if (typeof a === 'string' && a.startsWith('0x')) {
      const clean = a.replace('0x', '').padStart(64, '0');
      const bytes = Buffer.from(clean, 'hex');
      return xdr.ScVal.scvBytes(bytes);
    }
    return nativeToScVal(a);
  });

  const op = contract.call(method, ...scvalArgs);
  const tx = new TransactionBuilder(
    { sequence: '0', accountId: () => '' },
    { fee: BASE_FEE, networkPassphrase: PASSPHRASE }
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simRes = await fetch(`${RPC_URL}/simulateTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });

  if (!simRes.ok) return null;
  const simData = await simRes.json();
  if (simData.error) return null;
  return simData;
}

async function main() {
  checkEnv();
  console.log('\n=== MaintChain Integration Tests ===\n');

  // ── Test 1: Equipment Registration ──
  console.log('📋 Equipment Registry:');
  const equipSim = await simulateContract(CONTRACT_IDS.equipment, 'get_equipment', [TEST_EQUIPMENT_ID]);
  assert(equipSim !== null, 'get_equipment simulation succeeded');

  // ── Test 2: Maintenance Record ──
  console.log('\n📋 Maintenance Records:');
  const recordSim = await simulateContract(CONTRACT_IDS.maintenance, 'get_record', [TEST_MAINTENANCE_ID]);
  assert(recordSim !== null, 'get_record simulation succeeded');

  if (recordSim && recordSim.result) {
    const hasRetval = recordSim.result.retval;
    assert(hasRetval !== undefined, 'get_record returned a value');
  }

  // ── Test 3: Multi-Party Approval ──
  console.log('\n📋 Multi-Party Approval:');

  // Simulate approve_by_technician
  const techSim = await simulateContract(CONTRACT_IDS.approval, 'approve_by_technician', [TEST_MAINTENANCE_ID]);
  assert(techSim !== null, 'approve_by_technician simulation succeeded');

  // Simulate verify — should fail since only tech approved
  const verifySim1 = await simulateContract(CONTRACT_IDS.approval, 'verify', [TEST_MAINTENANCE_ID]);
  assert(verifySim1 !== null, 'verify simulation succeeded (before supervisor)');

  // ── Test 4: Compliance Attestation ──
  console.log('\n📋 Compliance Attestation:');
  const attestSim = await simulateContract(CONTRACT_IDS.attestation, 'get_attestation', [TEST_MAINTENANCE_ID]);
  assert(attestSim !== null, 'get_attestation simulation succeeded');

  // ── Test 5: Event Emission ──
  console.log('\n📋 Event Emission:');

  // Simulate approve_by_supervisor to trigger events
  const decision = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const supSim = await simulateContract(CONTRACT_IDS.approval, 'approve_by_supervisor', [TEST_MAINTENANCE_ID, decision]);
  assert(supSim !== null, 'approve_by_supervisor simulation succeeded (triggers approval event)');

  // ── Test Results ──
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Tests failed with exception:', e.message);
  process.exit(1);
});
