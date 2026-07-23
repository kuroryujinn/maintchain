// scripts/test-setup.mjs
// Creates test data for integration tests.
// Run: node scripts/test-setup.mjs
// Requires: SOROBAN_RPC_URL, DEPLOYER_SECRET_KEY, and all CONTRACT_ID env vars.

import { Keypair, Contract, TransactionBuilder, Networks, BASE_FEE,
  SorobanDataBuilder, xdr, nativeToScVal, Memo } from '@stellar/stellar-sdk';

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const DEPLOYER_SECRET = process.env.DEPLOYER_SECRET_KEY;

const CONTRACT_IDS = {
  equipment: process.env.NEXT_PUBLIC_EQUIPMENT_REGISTRY_ID,
  maintenance: process.env.NEXT_PUBLIC_MAINTENANCE_RECORDS_ID,
  approval: process.env.NEXT_PUBLIC_MULTI_PARTY_APPROVAL_ID,
  attestation: process.env.NEXT_PUBLIC_COMPLIANCE_ATTESTATION_ID,
};

function checkEnv() {
  const missing = [];
  if (!DEPLOYER_SECRET) missing.push('DEPLOYER_SECRET_KEY');
  for (const [name, id] of Object.entries(CONTRACT_IDS)) {
    if (!id) missing.push(`CONTRACT_ID for ${name}`);
  }
  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '));
    process.exit(1);
  }
}

function testId(prefix) {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return `0x0000000000000000${prefix}${random}`;
}

async function invokeContract(contractId, method, args, secretKey) {
  const kp = Keypair.fromSecret(secretKey);
  const address = kp.publicKey();
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

  // Get account sequence
  const accountRes = await fetch(`${RPC_URL}/accounts/${encodeURIComponent(address)}`);
  if (!accountRes.ok) throw new Error(`Failed to load account: ${accountRes.statusText}`);
  const { sequence } = await accountRes.json();

  // Build initial tx
  const tx = new TransactionBuilder(
    { sequence, accountId: () => address },
    { fee: BASE_FEE, networkPassphrase: PASSPHRASE }
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  // Simulate
  const simRes = await fetch(`${RPC_URL}/simulateTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });
  if (!simRes.ok) throw new Error(`Simulation failed: ${simRes.statusText}`);
  const simulation = await simRes.json();
  if (simulation.error) throw new Error(`Simulation error: ${simulation.error}`);

  // Build final tx
  const sorobanData = xdr.SorobanTransactionData.fromXDR(simulation.transactionData, 'base64');
  const finalTx = new TransactionBuilder(
    { sequence, accountId: () => address },
    { fee: BASE_FEE, networkPassphrase: PASSPHRASE, sorobanData: new SorobanDataBuilder(sorobanData).build() }
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  // Sign and submit
  const txEnvelope = xdr.TransactionEnvelope.fromXDR(finalTx.toXDR(), 'base64');
  txEnvelope.sign(kp);
  const signedXDR = txEnvelope.toXDR('base64');

  const sendRes = await fetch(`${RPC_URL}/sendTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedXDR }),
  });
  if (!sendRes.ok) throw new Error(`Submit failed: ${sendRes.statusText}`);
  const sendResult = await sendRes.json();

  // Poll for completion
  const txHash = sendResult.hash;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const pollRes = await fetch(`${RPC_URL}/getTransaction/${encodeURIComponent(txHash)}`);
    if (pollRes.ok) {
      const pollResult = await pollRes.json();
      if (pollResult.status === 'SUCCESS' || pollResult.status === 'FAILED') {
        return { txHash, status: pollResult.status };
      }
    }
  }
  return { txHash, status: 'TIMEOUT' };
}

async function main() {
  checkEnv();
  console.log('=== MaintChain Test Setup ===');
  console.log('RPC URL:', RPC_URL);
  console.log('Deployer:', Keypair.fromSecret(DEPLOYER_SECRET).publicKey());
  console.log('Contract IDs:', CONTRACT_IDS);

  const equipmentId = testId('EQ');
  const maintenanceId = testId('MA');
  const certHash = testId('CE');

  console.log('\n--- Creating test equipment ---');
  const equipResult = await invokeContract(CONTRACT_IDS.equipment, 'register_equipment', [
    equipmentId,
    '0x0000000000000000000000000000000000000000000000000000000000000001' // owner
  ], DEPLOYER_SECRET);
  console.log('Equipment registration:', equipResult.status);
  console.log('Equipment ID:', equipmentId);

  console.log('\n--- Creating test maintenance record ---');
  const maintResult = await invokeContract(CONTRACT_IDS.maintenance, 'create_record', [
    maintenanceId,
    equipmentId,
    nativeToScVal(Keypair.fromSecret(DEPLOYER_SECRET).publicKey())
  ], DEPLOYER_SECRET);
  console.log('Maintenance record creation:', maintResult.status);
  console.log('Maintenance ID:', maintenanceId);

  console.log('\n--- Setup complete ---');
  console.log('\nExport these for use in test-integration.mjs:');
  console.log(`export TEST_EQUIPMENT_ID="${equipmentId}"`);
  console.log(`export TEST_MAINTENANCE_ID="${maintenanceId}"`);
  console.log(`export TEST_CERT_HASH="${certHash}"`);
}

main().catch(e => {
  console.error('Setup failed:', e.message);
  process.exit(1);
});
