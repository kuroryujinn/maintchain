'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, ExternalLink, Loader2, AlertTriangle, Wallet, Shield, FileCheck, Database, Server, XCircle } from 'lucide-react';

import { useSoroban, IDENTITY_REGISTRY_ID } from '@/hooks/useSoroban';
import { api } from '@/lib/api';
import type { UserResponse } from '@/lib/api-types';

// ─── Role code mapping (matching backend CHECK constraint) ───
const ROLE_CODES: Record<string, number> = {
  TECHNICIAN: 1,
  SUPERVISOR: 2,
  AUDITOR: 3,
  OWNER: 4,
};

const ALLOWED_ROLES = ['TECHNICIAN', 'SUPERVISOR', 'AUDITOR', 'OWNER'];

// ─── Step enum ───
type Step =
  | 'idle'
  | 'connecting_wallet'
  | 'wallet_connected'
  | 'checking_readiness'
  | 'checking_user'
  | 'user_form'
  | 'registering_user'
  | 'review_verification'
  | 'computing_hashes'
  | 'signing_transaction'
  | 'submitting_transaction'
  | 'confirming_transaction'
  | 'transaction_failed'
  | 'syncing_backend'
  | 'success'
  | 'error';

// ─── SHA-256 helper (Web Crypto API) ───
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Explorer URL ───
const STELLAR_EXPLORER_TX = 'https://stellar.expert/explorer/testnet/tx';

// ─── Error display component ───
function ErrorPanel({ title, message, actionLabel, actionHref, onRetry }: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
        <div className="space-y-2">
          <h3 className="font-semibold text-red-800">{title}</h3>
          <p className="text-sm text-red-700">{message}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            )}
            {actionLabel && actionHref && (
              <Link
                href={actionHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                {actionLabel} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───
function StepIndicator({ current, step, label }: { current: Step; step: Step; label: string }) {
  const isActive = current === step;
  // Determine if this step is in the past (completed)
  const order: Step[] = [
    'idle', 'connecting_wallet', 'wallet_connected', 'checking_readiness',
    'checking_user', 'user_form', 'registering_user',
    'review_verification', 'computing_hashes', 'signing_transaction',
    'submitting_transaction', 'confirming_transaction', 'transaction_failed',
    'syncing_backend', 'success', 'error',
  ];
  const currentIdx = order.indexOf(current);
  const stepIdx = order.indexOf(step);
  const isPast = stepIdx >= 0 && currentIdx >= 0 && stepIdx < currentIdx && current !== 'error' && current !== 'transaction_failed';

  return (
    <div className={`flex items-center gap-2 ${isPast ? 'text-emerald-600' : isActive ? 'text-blue-600' : 'text-slate-300'}`}>
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
        isPast ? 'bg-emerald-100' : isActive ? 'bg-blue-100' : 'bg-slate-100'
      }`}>
        {isPast ? <CheckCircle className="h-3.5 w-3.5" /> : stepIdx + 1}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

// ─── Main Page Component ───
export default function GetVerifiedPage() {
  const soroban = useSoroban();

  const [step, setStep] = useState<Step>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorTitle, setErrorTitle] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('TECHNICIAN');
  const [organization, setOrganization] = useState('');

  // User + verification state
  const [existingUser, setExistingUser] = useState<UserResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contractIdDisplay, setContractIdDisplay] = useState<string>('');
  const [verificationRecord, setVerificationRecord] = useState<any>(null);
  const [profileHash, setProfileHash] = useState<string>('');
  const [orgHash, setOrgHash] = useState<string>('');

  // ─── Derived state ───
  const isContractConfigured = useMemo(() => {
    return IDENTITY_REGISTRY_ID.length > 0;
  }, []);

  // ─── Error handler ───
  const setError = useCallback((title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setStep('error');
  }, []);

  // ─── Step 1-2: Connect wallet & check readiness ───
  const handleConnectAndCheck = useCallback(async () => {
    setStep('connecting_wallet');

    try {
      // Connect wallet (handles Freighter detection internally)
      if (!soroban.isConnected) {
        await soroban.connectWallet();
      }

      if (!soroban.isConnected || !soroban.address) {
        setError('Wallet Required', 'Please connect your Freighter wallet to continue.');
        return;
      }

      setStep('wallet_connected');

      // Verify network
      if (!soroban.networkOk) {
        setError('Wrong Network', 'Please switch your Freighter wallet to Stellar Testnet.');
        return;
      }

      // Verify session auth (challenge-response must have completed)
      if (!soroban.sessionVerified) {
        setError('Session Required', 'Wallet signature verification failed. Please reconnect your wallet and approve the signature prompt.');
        return;
      }

      // Check backend readiness
      setStep('checking_readiness');
      const readiness = await api.verificationReadiness();

      if (!readiness.database_ready) {
        setError('Backend Unavailable', 'The verification backend database is not reachable. Please try again later.');
        return;
      }

      if (!readiness.identity_registry_configured) {
        if (!isContractConfigured) {
          setError(
            'Contract Not Configured',
            'The IdentityRegistry contract ID is not set in the frontend environment. ' +
            'Set NEXT_PUBLIC_IDENTITY_REGISTRY_ID in your .env.local file.'
          );
          return;
        }
      }

      // Check or create user
      setStep('checking_user');
      try {
        const user = await api.getUserByStellar(soroban.address);
        setExistingUser(user);
        setName(user.name);
        setRole(user.role);
        setOrganization(user.organization || '');
        setStep('review_verification');
      } catch {
        // User not found — show form
        setExistingUser(null);
        setStep('user_form');
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('Freighter') || msg.includes('wallet') || msg.includes('install')) {
        setError('Freighter Required', 'Please install the Freighter browser extension to continue.');
      } else {
        setError('Connection Failed', msg);
      }
    }
  }, [soroban, isContractConfigured, setError]);

  // ─── Step 3b: Register new user ───
  const handleRegisterUser = useCallback(async () => {
    if (!soroban.address) {
      setError('Wallet Required', 'Please connect your wallet first.');
      return;
    }

    if (!name.trim()) {
      setError('Name Required', 'Please enter your full name.');
      return;
    }

    setStep('registering_user');

    try {
      const user = await api.registerUser({
        stellar_address: soroban.address,
        name: name.trim(),
        role,
        organization: organization.trim() || undefined,
      });
      setExistingUser(user);
      setStep('review_verification');
    } catch (e: any) {
      setError('Registration Failed', e?.message || 'Could not create user profile.');
    }
  }, [soroban.address, name, role, organization, setError]);

  // ─── Step 4-7: Execute verification ───
  const handleExecuteVerification = useCallback(async () => {
    if (!soroban.address || !soroban.callContract) {
      setError('Wallet Required', 'Please connect your wallet first.');
      return;
    }

    if (!isContractConfigured) {
      setError('Contract Not Configured', 'NEXT_PUBLIC_IDENTITY_REGISTRY_ID is not set.');
      return;
    }

    if (!existingUser) {
      setError('User Required', 'Please create your profile before verifying.');
      return;
    }

    try {
      // Step 4: Compute hashes
      setStep('computing_hashes');
      const orgHashHex = await sha256Hex(organization || '');
      const profileHashHex = await sha256Hex(JSON.stringify({
        stellar_address: soroban.address,
        name,
        role,
        organization: organization || null,
      }));
      setOrgHash(orgHashHex);
      setProfileHash(profileHashHex);

      // Step 5: On-chain verification
      setStep('signing_transaction');
      const roleCode = ROLE_CODES[role] ?? 1;

      const txResult = await soroban.callContract(
        IDENTITY_REGISTRY_ID,
        'verify_identity',
        [
          soroban.address,
          roleCode,
          orgHashHex,
          profileHashHex,
        ],
      );

      if (!txResult || !txResult.transactionHash) {
        throw new Error('Transaction completed but no hash was returned.');
      }

      setTxHash(txResult.transactionHash);
      setContractIdDisplay(IDENTITY_REGISTRY_ID);

      if (txResult.status === 'FAILED') {
        setStep('transaction_failed');
        setError(
          'Transaction Failed',
          `The Soroban transaction was submitted but failed. Check the explorer for details.`
        );
        return;
      }

      setStep('confirming_transaction');

      // Step 6: Mirror to backend
      setStep('syncing_backend');
      try {
        const record = await api.createVerification({
          stellar_address: soroban.address,
          role,
          organization: organization.trim() || undefined,
          profile_hash: profileHashHex,
          organization_hash: orgHashHex,
          verification_tx_hash: txResult.transactionHash,
          verified_at: new Date().toISOString(),
          network: 'TESTNET',
        });
        setVerificationRecord(record);
      } catch (e: any) {
        // Chain succeeded, DB sync failed — show partial success
        console.warn('Verification on-chain succeeded but backend sync failed:', e);
        setVerificationRecord({
          stellar_address: soroban.address,
          role,
          organization: organization || null,
          verification_tx_hash: txResult.transactionHash,
          network: 'TESTNET',
          _backend_sync_failed: true,
        });
      }

      // Step 7: Success
      setStep('success');
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('sign') || msg.includes('reject') || msg.includes('denied')) {
        setError('Signature Rejected', 'You rejected the transaction in Freighter. Please try again and approve the signature request.');
      } else if (msg.includes('simulation') || msg.includes('simulate')) {
        setError('Simulation Failed', `The contract call simulation failed: ${msg}. Check that the IdentityRegistry contract is deployed.`);
      } else if (msg.includes('timeout') || msg.includes('poll')) {
        setError('Confirmation Timeout', 'The transaction was submitted but confirmation is taking longer than expected. Check the explorer for status.');
      } else {
        setError('Verification Failed', msg);
      }
    }
  }, [soroban, isContractConfigured, existingUser, name, role, organization, setError]);

  // ─── Auto-connect on mount ───
  useEffect(() => {
    if (soroban.isConnected && soroban.address && step === 'idle') {
      handleConnectAndCheck();
    }
  }, [soroban.isConnected, soroban.address, step, handleConnectAndCheck]);

  // ─── Render ───
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          <span>01</span>
          <span aria-hidden="true">·</span>
          <span>Identity verification</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Get Verified
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Prove your identity on Stellar Testnet with a signed Soroban transaction.
          This is a real blockchain transaction that will deduct a small amount of
          testnet XLM for gas fees.
        </p>
      </div>

      {/* Step progress */}
      {step !== 'idle' && step !== 'error' && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm">
          <StepIndicator current={step} step="connecting_wallet" label="Wallet" />
          <StepIndicator current={step} step="checking_readiness" label="Readiness" />
          <StepIndicator current={step} step="checking_user" label="Profile" />
          <StepIndicator current={step} step="review_verification" label="Review" />
          <StepIndicator current={step} step="signing_transaction" label="Sign" />
          <StepIndicator current={step} step="syncing_backend" label="Sync" />
          <StepIndicator current={step} step="success" label="Done" />
        </div>
      )}

      {/* ─── Wallet State Display ─── */}
      {soroban.isConnected && soroban.address && (
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Connected Wallet</div>
                <div className="font-mono text-sm text-slate-900">
                  {soroban.address.slice(0, 8)}...{soroban.address.slice(-6)}
                </div>
              </div>
            </div>
            {soroban.balanceXlm !== null && (
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500">Balance</div>
                <div className="text-sm font-semibold text-slate-900">
                  {parseFloat(soroban.balanceXlm).toFixed(2)} XLM
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Error State ─── */}
      {step === 'error' && (
        <ErrorPanel
          title={errorTitle}
          message={errorMessage}
          onRetry={handleConnectAndCheck}
          actionLabel="View Testnet Faucet"
          actionHref="https://lab.stellar.org/"
        />
      )}

      {/* ─── Idle State: Start Button ─── */}
      {step === 'idle' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-8 text-center backdrop-blur-sm">
          <Shield className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Ready to Get Verified?</h2>
          <p className="mt-2 text-sm text-slate-600">
            You&apos;ll connect Freighter, review your identity, sign one Stellar Testnet transaction,
            and receive a verifiable proof of identity on-chain.
          </p>
          <button
            onClick={handleConnectAndCheck}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
          >
            Start Verification <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── Connecting / Checking States ─── */}
      {(step === 'connecting_wallet' || step === 'wallet_connected' || step === 'checking_readiness' || step === 'checking_user' || step === 'computing_hashes' || step === 'signing_transaction' || step === 'submitting_transaction' || step === 'confirming_transaction' || step === 'syncing_backend') && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-8 text-center backdrop-blur-sm">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {step === 'connecting_wallet' && 'Connecting Wallet...'}
            {step === 'wallet_connected' && 'Wallet Connected'}
            {step === 'checking_readiness' && 'Checking Backend Readiness...'}
            {step === 'checking_user' && 'Looking Up Your Profile...'}
            {step === 'computing_hashes' && 'Computing Identity Hashes...'}
            {step === 'signing_transaction' && 'Waiting for Freighter Signature...'}
            {step === 'submitting_transaction' && 'Submitting Transaction...'}
            {step === 'confirming_transaction' && 'Confirming Transaction...'}
            {step === 'syncing_backend' && 'Syncing with Backend...'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {step === 'signing_transaction' && 'Please check Freighter and approve the signature request. This will pay a small amount of testnet XLM for gas fees.'}
            {step === 'confirming_transaction' && 'Waiting for the Soroban RPC to confirm the transaction. This usually takes a few seconds.'}
          </p>
        </div>
      )}

      {/* ─── User Form ─── */}
      {step === 'user_form' && !existingUser && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold">Create Your Identity Profile</h2>
          </div>
          <p className="text-sm text-slate-600">
            This profile will be registered on the backend before you sign the verification transaction.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus-ring"
              >
                {ALLOWED_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Organization</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Acme Industrial"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus-ring"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRegisterUser}
              disabled={!name.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Profile & Continue <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setStep('idle'); setExistingUser(null); }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Registering User ─── */}
      {step === 'registering_user' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-8 text-center backdrop-blur-sm">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Creating Your Profile...</h2>
        </div>
      )}

      {/* ─── Review & Execute ─── */}
      {step === 'review_verification' && existingUser && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-emerald-500" />
            <h2 className="text-lg font-semibold">Review Your Verification</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Name</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{name}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Role</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{role}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <div className="text-xs font-medium text-slate-500">Organization</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{organization || '(none)'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <div className="text-xs font-medium text-slate-500">Wallet</div>
              <div className="mt-1 font-mono text-sm text-slate-900 break-all">{soroban.address}</div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <strong>Ready to sign?</strong> The next step will open Freighter to sign a
                real Soroban transaction on Stellar Testnet. This will deduct a small amount
                of testnet XLM for gas fees. No real funds are used.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExecuteVerification}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,163,74,0.35)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(22,163,74,0.45)] hover:-translate-y-0.5"
            >
              Sign Verification Transaction <Shield className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setStep('idle'); }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Transaction Failed (with option to retry) ─── */}
      {step === 'transaction_failed' && (
        <div className="space-y-6">
          <ErrorPanel
            title="Transaction Failed"
            message="The Soroban transaction was submitted but failed. This can happen if the contract is not deployed or the parameters are invalid."
            onRetry={handleExecuteVerification}
            actionLabel="View Transaction"
            actionHref={txHash ? `${STELLAR_EXPLORER_TX}/${txHash}` : undefined}
          />
          {txHash && (
            <div className="rounded-xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm">
              <div className="text-xs font-medium text-slate-500">Transaction Hash</div>
              <div className="mt-1 font-mono text-xs text-slate-900 break-all">{txHash}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Success State ─── */}
      {step === 'success' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 backdrop-blur-sm">
            <div className="text-center">
              <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 text-2xl font-bold text-emerald-900">Verification Complete!</h2>
              <p className="mt-2 text-sm text-emerald-700">
                Your identity has been verified on Stellar Testnet. The proof is stored
                on-chain and mirrored in the backend.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-white p-4">
                <div className="text-xs font-medium text-emerald-600">Status</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle className="h-4 w-4" /> Verified
                </div>
              </div>

              {verificationRecord?._backend_sync_failed && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="text-xs text-amber-800">
                      Verification succeeded on-chain, but the backend sync failed.
                      The on-chain record is still valid. Contact support to resolve the mirror.
                    </div>
                  </div>
                </div>
              )}

              {txHash && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Transaction Hash</div>
                  <div className="mt-1 font-mono text-xs text-slate-900 break-all">{txHash}</div>
                  <a
                    href={`${STELLAR_EXPLORER_TX}/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View on Stellar Expert <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {contractIdDisplay && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Contract ID</div>
                  <div className="mt-1 font-mono text-xs text-slate-900 break-all">{contractIdDisplay}</div>
                </div>
              )}

              {verificationRecord?.verified_at && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Verified At</div>
                  <div className="mt-1 text-sm text-slate-900">
                    {new Date(verificationRecord.verified_at).toLocaleString()}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Role / Organization</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {role}{organization ? ` · ${organization}` : ''}
                </div>
              </div>
            </div>

            {profileHash && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-[10px] font-medium text-slate-400">Profile Hash</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-600 break-all">{profileHash}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-[10px] font-medium text-slate-400">Organization Hash</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-600 break-all">{orgHash}</div>
                  </div>
                </div>
              </details>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={txHash ? `${STELLAR_EXPLORER_TX}/${txHash}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white hover:-translate-y-0.5"
            >
              View Transaction <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* ─── Dashboard-style bottom gap ─── */}
      <div className="h-8" />
    </div>
  );
}
