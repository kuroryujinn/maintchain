'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getNetwork,
  isConnected as freighterIsConnected,
  requestAccess,
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
    } catch {
      // ignore
    }
  }, []);

  const persistAddress = useCallback((next: string | null) => {
    try {
      if (!next) localStorage.removeItem(FREIGHTER_LOCAL_KEY);
      else localStorage.setItem(FREIGHTER_LOCAL_KEY, next);
      window.dispatchEvent(new Event(WALLET_CHANGED_EVENT));
    } catch {
      // ignore
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
    } catch {
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

      // After wallet connection succeeds, verify ownership
      await verifyWalletOwnership(authAddress);
    } catch (e: any) {
      setWalletError({
        message: e?.message ? String(e.message) : 'Freighter connection failed.',
      });
      setIsConnected(false);
      setAddress(null);
      persistAddress(null);
    }
  }, [detectFreighter, persistAddress, refreshBalance, validateNetwork]);

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
  }, [persistAddress]);

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

  // ── Challenge-response wallet ownership verification ──

  const AUTH_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

  const [verifiedWallet, setVerifiedWallet] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  /**
   * Verify wallet ownership via challenge-response.
   * After Freighter grants access, this proves the user holds the private key.
   */
  const verifyWalletOwnership = useCallback(async (walletAddress: string): Promise<boolean> => {
    try {
      setVerifiedWallet(false);
      setVerificationError(null);

      // 1. Request nonce from backend
      const challengeRes = await fetch(`${AUTH_API_BASE}/api/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: walletAddress }),
      });

      if (!challengeRes.ok) {
        throw new Error(`Challenge request failed: ${challengeRes.statusText}`);
      }

      const { nonce, message } = await challengeRes.json();

      // 2. Sign the nonce message with Freighter
      // Create a minimal transaction that carries the nonce as its memo
      // This is a standard Stellar approach — the nonce in the memo field
      // proves the signer controls the account.
      const { TransactionBuilder, Operation, Networks, BASE_FEE, Memo, Asset } =
        await import('@stellar/stellar-sdk');

      const server = new (await import('@stellar/stellar-sdk')).Horizon.Server(
        process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org'
      );

      const sourceAccount = await server.loadAccount(walletAddress);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.payment({
          destination: walletAddress, // Pay ourselves (min XLM)
          asset: Asset.native(),
          amount: '0.0000001',
        }))
        .addMemo(Memo.text(message.slice(0, 28))) // Memo max 28 bytes
        .setTimeout(30)
        .build();

      const txXDR = tx.toXDR();

      const signed = await freighterSignTransaction(txXDR, {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      });

      if (signed.error) throw new Error(`Signing error: ${signed.error.message}`);
      if (!signed.signedTxXdr) throw new Error('No signed XDR returned');

      // 3. Send signed transaction XDR to backend for verification
      const verifyRes = await fetch(`${AUTH_API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stellar_address: walletAddress,
          nonce: message,
          signature: signed.signedTxXdr,
        }),
      });

      if (!verifyRes.ok) {
        const errBody = await verifyRes.text().catch(() => '');
        throw new Error(`Verification failed: ${errBody}`);
      }

      const { verified, token } = await verifyRes.json();

      if (!verified) {
        throw new Error('Wallet ownership not verified');
      }

      // 4. Store session token
      localStorage.setItem('maintchain:auth:token', token);
      setVerifiedWallet(true);
      return true;

    } catch (e: any) {
      const msg = e?.message || String(e);
      setVerificationError(msg);
      setVerifiedWallet(false);
      return false;
    }
  }, [AUTH_API_BASE]);

  return {
    freighterInstalled,
    isConnected,
    address,
    connectWallet,
    disconnectWallet,
    walletError,

    networkOk,
    networkError,

    balanceLoading,
    balanceXlm,
    balanceError,
    refreshBalance,

    sendLoading,
    sendXlm,
    txHash,
    sendError,

    callContract,

    verifiedWallet,
    verificationError,
    verifyWalletOwnership,
  };
};
