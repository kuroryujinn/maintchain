'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TransactionBuilder,
  Operation,
  Networks,
  Asset,
  BASE_FEE,
  Memo,
} from '@stellar/stellar-sdk';

const FREIGHTER_LOCAL_KEY = 'maintchain:freighter:address';

type WalletError = { message: string } | null;

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';

// Freighter identity gives you a public address for whatever it is connected to.
// For this project we want to operate on Stellar Testnet.
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

  const detectFreighter = useCallback(() => {
    const installed = typeof window !== 'undefined' && !!(window as any).Freighter;
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
    } catch {
      // ignore
    }
  }, []);

  const getWalletNetworkInfo = useCallback(async () => {
    // Freighter network information API is not guaranteed across versions.
    // We'll probe a few shapes and fall back to "unknown" => treated as mismatch.
    const f: any = (window as any).Freighter;

    try {
      if (!f) return { kind: 'missing' as const, raw: null };

      // Newer freighter versions: identity.getPublicKey + "network" property.
      if (typeof f.getNetwork === 'function') {
        const net = await f.getNetwork();
        return { kind: 'value' as const, raw: net };
      }

      // Some versions may store it.
      if (f.network) return { kind: 'value' as const, raw: f.network };

      // Identity method can sometimes include network.
      if (f.identity && typeof f.identity.getAddress === 'function') {
        const addr = await f.identity.getAddress();
        // no network info; return address (still useful, but mismatch check can't be done)
        return { kind: 'address_only' as const, raw: addr };
      }

      return { kind: 'unknown' as const, raw: null };
    } catch (e: any) {
      return { kind: 'error' as const, raw: e?.message ?? String(e) };
    }
  }, []);

  const validateNetwork = useCallback(async () => {
    // Deterministic best-effort mismatch detection.
    // We only set networkOk=true if we have reasonably strong evidence of TESTNET.
    try {
      setNetworkError(null);

      const installed = detectFreighter();
      if (!installed) {
        setNetworkOk(false);
        setNetworkError({ message: 'Freighter not found.' });
        return false;
      }

      const info = await getWalletNetworkInfo();
      const raw = (info as any).raw;
      const rawStr = raw ? String(raw).toLowerCase() : '';

      const looksLikeTestnet =
        rawStr.includes('testnet') || rawStr.includes('passphrase_testnet') || rawStr === 'test';

      const looksLikeMainnet =
        rawStr.includes('public') || rawStr.includes('mainnet') || rawStr.includes('passphrase_main');

      if (info.kind === 'value') {
        if (looksLikeTestnet) {
          setNetworkOk(true);
          return true;
        }
        if (looksLikeMainnet) {
          setNetworkOk(false);
          setNetworkError({
            message: 'Network mismatch: connect a Freighter session for Stellar Testnet.',
          });
          return false;
        }
        // Unknown value => block sends but show guidance
        setNetworkOk(false);
        setNetworkError({
          message:
            'Unable to verify Freighter network. Continue only if you are on Stellar Testnet.',
        });
        return false;
      }

      if (info.kind === 'address_only') {
        // Can't verify => block sends but keep UI usable.
        setNetworkOk(false);
        setNetworkError({
          message:
            'Unable to verify Freighter network. Continue only if you are on Stellar Testnet.',
        });
        return false;
      }

      // missing/unknown/error => block sends
      setNetworkOk(false);
      setNetworkError({
        message:
          'Unable to verify Freighter network. Continue only if you are on Stellar Testnet.',
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

  const refreshBalance = useCallback(async () => {
    if (!address) return;

    setBalanceLoading(true);
    setBalanceError(null);

    try {
      const res = await fetch(`${horizon.url}/accounts/${encodeURIComponent(address)}`);
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
      // Unfunded account or not found
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

    const installed = detectFreighter();
    if (!installed) {
      setWalletError({ message: 'Please install Freighter wallet.' });
      return;
    }

    try {
      const f: any = (window as any).Freighter;

      const authAddress = await f.identity.getAddress();
      setAddress(authAddress);
      setIsConnected(true);
      persistAddress(authAddress);

      // Verify network mismatch (testnet requirement)
      await validateNetwork();

      // Balance load
      await refreshBalance();
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
    // Freighter doesn't always offer a "disconnect" that clears identity in-extension.
    // We'll clear our app state and localStorage.
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
    detectFreighter();
    readPersistedAddress();
  }, [detectFreighter, readPersistedAddress]);

  useEffect(() => {
    // If we have persisted address, attempt to verify network + refresh balance.
    if (!address) return;
    validateNetwork().then(() => refreshBalance());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const sendXlm = useCallback(
    async (destination: string, amountXlm: string) => {
      setSendLoading(true);
      setSendError(null);
      setTxHash(null);

      try {
        const f: any = (window as any).Freighter;
        if (!f) throw new Error('Freighter not found.');

        if (!address) throw new Error('Wallet not connected.');
        if (!networkOk) {
          throw new Error('Network mismatch: please connect to Stellar Testnet.');
        }

        const amount = Number(amountXlm);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Amount must be a positive number.');
        }

        // Build payment transaction
        // Base fee (stroops). Horizon allows fetching current base fee.
        // If it fails, fall back to BASE_FEE from stellar-sdk.
        const baseFeeRes = await fetch(`${horizon.url}/fee_stats`);
        let feeNum = BASE_FEE;

        if (baseFeeRes.ok) {
          const feeStats = await baseFeeRes.json();
          // Typically: { fee_charged: 100, last_ledger_base_fee: 100, ... }
          // We'll use last_ledger_base_fee if present; otherwise keep BASE_FEE.
          const last = feeStats?.last_ledger_base_fee ?? feeStats?.fee_charged;
          if (typeof last === 'number') feeNum = String(last);
        }

        const account = await fetch(`${horizon.url}/accounts/${encodeURIComponent(address)}`)
          .then(async (r) => {
            if (!r.ok) {
              const body = await r.json().catch(() => null);
              throw new Error(body?.title ?? r.statusText);
            }
            return r.json();
          })
          .then((a) => {
            // stellar-sdk TransactionBuilder expects an account response convertible object.
            // We can pass the Horizon account JSON directly to loadAccount via client,
            // but we removed that client import; so we manually adapt minimal fields:
            return a;
          });

        const op = Operation.payment({
          destination,
          asset: Asset.native(),
          amount: amount.toFixed(7), // enough precision for XLM
        });

        const tx = new TransactionBuilder(
          // TransactionBuilder accepts account-like object: { sequence, account_id, balances, ... }
          account,
          {
            fee: feeNum,
            networkPassphrase: NETWORK_PASSPHRASE,
          }
        )
          .addOperation(op)
          .addMemo(Memo.text('MaintChain testnet payment'))
          .setTimeout(30)
          .build();

        // Serialize to XDR
        const txXDR = tx.toXDR();

        // Preference: use "submitTransaction" if it exists on this Freighter version
        // Otherwise: signTransaction(txXDR, networkPassphrase) + submitTransaction(txSigned)
        const freighterAny: any = (window as any).Freighter;

        let signedXDR: string | null = null;

        if (typeof freighterAny.submitTransaction === 'function') {
          // Some versions accept txXDR and network passphrase, others accept tx.
          // We'll try signature patterns with runtime checks.
          const submitResult = await freighterAny.submitTransaction(
            txXDR,
            NETWORK_PASSPHRASE
          ).catch(async (e: any) => {
            // fallback: maybe submit expects transaction object
            return freighterAny.submitTransaction(txXDR).catch(() => {
              throw e;
            });
          });

          // submitResult may contain tx hash or return a Stellar tx response.
          const hash =
            submitResult?.hash ??
            submitResult?.transactionHash ??
            submitResult?.result?.hash ??
            tx.hash().toString();

          setTxHash(hash);
          return hash;
        }

        if (typeof freighterAny.signTransaction === 'function') {
          signedXDR = await freighterAny.signTransaction(txXDR, NETWORK_PASSPHRASE);

          if (!signedXDR) throw new Error('Signing failed.');

          // Submit signed tx to Horizon
          const res = await fetch(`${horizon.url}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tx_blob: signedXDR }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => null);
            const title = body?.title ?? res.statusText;
            throw new Error(title);
          }

          const body = await res.json();
          const hash = body?.hash ?? tx.hash().toString();
          setTxHash(hash);
          return hash;
        }

        throw new Error(
          'Unsupported Freighter wallet API. submitTransaction/signTransaction not available.'
        );
      } catch (e: any) {
        setSendError(String(e?.message ?? e));
        throw e;
      } finally {
        setSendLoading(false);
      }
    },
    [address, networkOk, horizon]
  );

  // Best-effort disconnect handler if Freighter exposes events.
  useEffect(() => {
    const f: any = (window as any).Freighter;
    if (!f) return;

    // Some versions: f.on('disconnect', cb) or f.on('accountChanged', cb)
    const anyF: any = f;

    try {
      if (typeof anyF.on === 'function') {
        const handleDisconnect = () => disconnectWallet();
        anyF.on('disconnect', handleDisconnect);
        // accountChanged can also act as "network/account changed"
      }
    } catch {
      // ignore
    }
  }, [disconnectWallet]);

  const callContract = useCallback(async (contractId: string, functionName: string, args: any[]) => {
    if (!window || !(window as any).Freighter) {
      throw new Error('Freighter not found');
    }

    // Freighter contract invocation signature varies across versions.
    // Common pattern is identity/invokeContract.
    const f: any = (window as any).Freighter;

    if (typeof f.invokeContract !== 'function') {
      throw new Error('Freighter invokeContract not available in this version.');
    }

    // Expected to return a result containing tx hash / status.
    const result = await f.invokeContract(contractId, functionName, args);
    return result;
  }, []);

  return {
    // wallet
    freighterInstalled,
    isConnected,
    address,
    connectWallet,
    disconnectWallet,
    walletError,

    // network
    networkOk,
    networkError,

    // balance
    balanceLoading,
    balanceXlm,
    balanceError,
    refreshBalance,

    // transaction
    sendLoading,
    sendXlm,
    txHash,
    sendError,

    // contract
    callContract,
  };
};
