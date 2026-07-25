'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getNetwork,
  isConnected as freighterIsConnected,
  requestAccess,
  signMessage as freighterSignMessage,
  signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api';
import {
  TransactionBuilder,
  Operation,
  Networks,
  Asset,
  BASE_FEE,
  Memo,
  Horizon,
} from '@stellar/stellar-sdk';


import { invokeContract, simulateContract, toScVal, bytes32ScVal } from '@/lib/soroban';

const FREIGHTER_LOCAL_KEY = 'maintchain:freighter:address';
const WALLET_CHANGED_EVENT = 'maintchain:soroban-wallet-changed';

type WalletError = { message: string } | null;

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export const useSoroban = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [freighterInstalled, setFreighterInstalled] = useState(false);

  const [walletError, setWalletError] = useState<WalletError>(null);

  const [networkError, setNetworkError] = useState<WalletError>(null);
  const [networkOk, setNetworkOk] = useState<boolean>(true);

  // ── Auth state (option (c) session) ──
  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionVerifying, setSessionVerifying] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const horizon = useMemo(() => {
    return {
      url: HORIZON_TESTNET_URL,
    };
  }, []);

  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceXlm, setBalanceXlm] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [sendLoading, setSendLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const detectFreighter = useCallback(async () => {
    const result = await freighterIsConnected();
    const installed = !!result.isConnected;
    setFreighterInstalled(installed);
    return installed;
  }, []);

  const readPersistedAddress = useCallback(() => {
    try {
      const persisted = localStorage.getItem(FREIGHTER_LOCAL_KEY);
      if (persisted) {
        setAddress(persisted);
        setIsConnected(true);
      }
    } catch (e) {
      // localStorage may be unavailable in some environments
      console.warn('Failed to read persisted wallet address:', e);
    }
  }, []);

  const persistAddress = useCallback((next: string | null) => {
    try {
      if (!next) localStorage.removeItem(FREIGHTER_LOCAL_KEY);
      else localStorage.setItem(FREIGHTER_LOCAL_KEY, next);
      window.dispatchEvent(new Event(WALLET_CHANGED_EVENT));
    } catch (e) {
      console.warn('Failed to persist wallet address:', e);
    }
  }, []);

  const getWalletNetworkInfo = useCallback(async () => {
    try {
      const net = await getNetwork();
      if (net.error) {
        return { kind: 'error' as const, raw: net.error.message };
      }

      return {
        kind: 'value' as const,
        raw: net.networkPassphrase ?? net.network,
      };
    } catch (e: any) {
      return { kind: 'error' as const, raw: e?.message ?? String(e) };
    }
  }, []);

  const validateNetwork = useCallback(async () => {
    try {
      setNetworkError(null);

      const installed = await detectFreighter();
      if (!installed) {
        setNetworkOk(false);
        setNetworkError({ message: 'Freighter not found.' });
        return false;
      }

      const info = await getWalletNetworkInfo();
      const raw = (info as any).raw;
      const rawStr = raw ? String(raw).toLowerCase() : '';

      if (info.kind === 'value') {
        if (String(raw) === NETWORK_PASSPHRASE) {
          setNetworkOk(true);
          return true;
        }

        if (rawStr.includes('testnet') || rawStr.includes('passphrase_testnet') || rawStr === 'test') {
          setNetworkOk(true);
          return true;
        }

        if (rawStr.includes('public') || rawStr.includes('mainnet') || rawStr.includes('passphrase_main')) {
          setNetworkOk(false);
          setNetworkError({
            message: 'Network mismatch: connect a Freighter session for Stellar Testnet.',
          });
          return false;
        }

        setNetworkOk(false);
        setNetworkError({
          message: 'Unable to verify Freighter network. Continue only if you are on Stellar Testnet.',
        });
        return false;
      }

      setNetworkOk(false);
      setNetworkError({
        message: 'Unable to verify Freighter network. Continue only if you are on Stellar Testnet.',
      });
      return false;
    } catch (e) {
      console.error('Network verification error:', e);
      setNetworkOk(false);
      setNetworkError({
        message: 'Failed to verify network. Please reconnect on Stellar Testnet.',
      });
      return false;
    }
  }, [detectFreighter, getWalletNetworkInfo]);

  const refreshBalance = useCallback(async (overrideAddress?: string) => {
    const accountAddress = overrideAddress ?? address;
    if (!accountAddress) return;

    setBalanceLoading(true);
    setBalanceError(null);

    try {
      const res = await fetch(`${horizon.url}/accounts/${encodeURIComponent(accountAddress)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const title = body?.title ?? res.statusText;
        throw new Error(title);
      }
      const account = await res.json();

      const xlm = (account.balances ?? []).find(
        (b: any) => b.asset_type === 'native'
      )?.balance;

      const amount = xlm ?? '0';
      setBalanceXlm(amount);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setBalanceXlm('0');
      setBalanceError(msg.includes('not_found') ? 'Account not found (unfunded).' : msg);
    } finally {
      setBalanceLoading(false);
    }
  }, [address, horizon]);

  // ── Auth: check existing session ──────────────────────────

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.stellar_address) {
          setSessionVerified(true);
          return data.stellar_address;
        }
      }
      setSessionVerified(false);
      return null;
    } catch {
      setSessionVerified(false);
      return null;
    }
  }, []);

  // ── Auth: verify wallet ownership via challenge-response ──

  const verifyWallet = useCallback(async (walletAddress: string): Promise<boolean> => {
    setSessionVerifying(true);
    setSessionError(null);

    try {
      // 1. Request challenge from backend
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: walletAddress }),
      });

      if (!challengeRes.ok) {
        const errBody = await challengeRes.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || 'Challenge request failed');
      }

      const { message } = await challengeRes.json();

      // 2. Sign the challenge message with Freighter's signMessage.
      //    This returns a raw Ed25519 signature over the message bytes,
      //    which the backend can verify directly using ed25519-dalek.
      //    (Using signTransaction would send a Stellar transaction XDR,
      //     which is NOT a raw signature and cannot be verified by the
      //     backend's verify_challenge handler.)
      const signed = await freighterSignMessage({ message });

      if (signed.error) {
        throw new Error(`Signing error: ${signed.error.message}`);
      }
      if (!signed.signedMessage) {
        throw new Error('No signed message returned from Freighter');
      }

      // 3. Send the raw Ed25519 signature to the proxy (which forwards
      //    to backend for verification). The proxy will create a session
      //    cookie on success.
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stellar_address: walletAddress,
          nonce: message,
          signature: signed.signedMessage,
        }),
      });

      if (!verifyRes.ok) {
        const errBody = await verifyRes.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || 'Signature verification failed');
      }

      setSessionVerified(true);
      return true;
    } catch (e: any) {
      const msg = e?.message || String(e);
      setSessionError(msg);
      setSessionVerified(false);
      return false;
    } finally {
      setSessionVerifying(false);
    }
  }, []);

  // ── Auth: clear session on disconnect ──

  const clearSession = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort — the cookie will expire eventually
    }
    setSessionVerified(false);
    setSessionError(null);
  }, []);

  const connectWallet = useCallback(async () => {
    setWalletError(null);
    setNetworkError(null);
    setNetworkOk(true);

    const installed = await detectFreighter();
    if (!installed) {
      setWalletError({ message: 'Please install Freighter wallet.' });
      return;
    }

    try {
      const accessResult = await requestAccess();
      if (accessResult.error) {
        throw new Error(accessResult.error.message);
      }

      const authAddress = accessResult.address;
      setAddress(authAddress);
      setIsConnected(true);
      persistAddress(authAddress);

      await validateNetwork();
      await refreshBalance(authAddress);

      // After wallet connects, verify ownership via challenge-response
      // The proxy sets an httpOnly session cookie on success
      await verifyWallet(authAddress);
    } catch (e: any) {
      setWalletError({
        message: e?.message ? String(e.message) : 'Freighter connection failed.',
      });
      setIsConnected(false);
      setAddress(null);
      persistAddress(null);
    }
  }, [detectFreighter, persistAddress, refreshBalance, validateNetwork, verifyWallet]);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
    setTxHash(null);
    setSendError(null);
    setBalanceError(null);
    setBalanceXlm(null);
    setNetworkError(null);
    setNetworkOk(true);
    persistAddress(null);

    // Clear the session cookie on the proxy
    clearSession();
  }, [persistAddress, clearSession]);

  useEffect(() => {
    void detectFreighter();
    readPersistedAddress();
  }, [detectFreighter, readPersistedAddress]);

  useEffect(() => {
    const syncWalletState = () => {
      readPersistedAddress();
    };

    window.addEventListener(WALLET_CHANGED_EVENT, syncWalletState);
    window.addEventListener('storage', syncWalletState);

    return () => {
      window.removeEventListener(WALLET_CHANGED_EVENT, syncWalletState);
      window.removeEventListener('storage', syncWalletState);
    };
  }, [readPersistedAddress]);

  useEffect(() => {
    if (!address) return;
    validateNetwork().then(() => refreshBalance());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // ── Fixed sendXlm: uses stellar-sdk Server for cleaner interaction ──
  const sendXlm = useCallback(
    async (destination: string, amountXlm: string) => {
      setSendLoading(true);
      setSendError(null);
      setTxHash(null);

      try {
        if (!address) throw new Error('Wallet not connected.');
        if (!networkOk) {
          throw new Error('Network mismatch: please connect to Stellar Testnet.');
        }

        const amount = Number(amountXlm);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Amount must be a positive number.');
        }

        const server = new Horizon.Server(HORIZON_TESTNET_URL);
        const sourceAccount = await server.loadAccount(address);
        const fee = await server.fetchBaseFee();

        const tx = new TransactionBuilder(sourceAccount, {
          fee: String(fee),
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            Operation.payment({
              destination,
              asset: Asset.native(),
              amount: amount.toFixed(7),
            }),
          )
          .addMemo(Memo.text('MaintChain payment'))
          .setTimeout(30)
          .build();

        const txXDR = tx.toXDR();
        const signed = await freighterSignTransaction(txXDR, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address,
        });

        if (signed.error) throw new Error(signed.error.message);
        if (!signed.signedTxXdr) throw new Error('Signing failed — no signed XDR returned.');

        const parsedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
        const result = await server.submitTransaction(parsedTx);
        setTxHash(result.hash);
        return result.hash;
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? 'Unknown error');
        setSendError(msg);
        throw e;
      } finally {
        setSendLoading(false);
      }
    },
    [address, networkOk],
  );

  // ── Fixed callContract: uses Soroban service instead of window.Freighter ──
  const callContract = useCallback(
    async (
      contractId: string,
      functionName: string,
      args: any[],
      options?: { simulate?: boolean },
    ) => {
      if (!address) throw new Error('Wallet not connected');

      const scValArgs = args.map((arg) => {
        if (typeof arg === 'string' && /^0x[0-9a-f]{64}$/i.test(arg)) {
          return bytes32ScVal(arg);
        }
        return toScVal(arg);
      });

      if (options?.simulate) {
        return simulateContract(contractId, functionName, scValArgs);
      }

      return invokeContract(contractId, functionName, scValArgs, address);
    },
    [address],
  );

  return {
    freighterInstalled,
    isConnected,
    address,
    connectWallet,
    disconnectWallet,
    walletError,

    networkOk,
    networkError,

    // Auth session state
    sessionVerified,
    sessionVerifying,
    sessionError,

    balanceLoading,
    balanceXlm,
    balanceError,
    refreshBalance,

    sendLoading,
    sendXlm,
    txHash,
    sendError,

    callContract,
  };
};
