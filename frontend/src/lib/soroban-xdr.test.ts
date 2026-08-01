// frontend/src/lib/soroban-xdr.test.ts
// Regression test for the getLedgerEntries XDR decode bug.
//
// Bug class under test: the Stellar RPC getLedgerEntries endpoint returns each
// entry as a LedgerEntryData XDR (the entry body WITHOUT the 4-byte
// lastModifiedLedgerSeq header). Decoding it as a full LedgerEntry misaligns
// the structure — the PublicKeyType enum inside the AccountEntry is read at the
// wrong offset and throws:
//
//   XDR Read Error: unknown PublicKeyType member for value -894924641
//
// That error surfaced as "Verification Failed" on /get-verified (and would have
// broken every on-chain call: approve, upload, audit). The fixture below is a
// REAL response captured from https://soroban-testnet.stellar.org for account
// GDFKRCE7XG…, so this test proves the fix against live-shaped data.

import { describe, expect, it } from 'vitest';
import { parseAccountSeqNum } from './soroban';

// Real getLedgerEntries entry.xdr (base64, LedgerEntryData shape) — the exact
// payload that previously threw "unknown PublicKeyType member for value
// -894924641" when decoded as a full LedgerEntry.
const REAL_LEDGER_ENTRY_XDR =
  'AAAAAAAAAADKqIifuZOCBWfc1hkWDe7yeIWADLfMl+xqkrh8g6IYlAAAABT0agh1ABcHHQAAAAYAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAADAAAAAAAjDP8AAAAAafJg8Q==';

describe('parseAccountSeqNum', () => {
  it('parses the sequence from the LedgerEntryData shape the live RPC returns', () => {
    expect(parseAccountSeqNum(REAL_LEDGER_ENTRY_XDR)).toBe('6481745599791110');
  });

  it('does not throw the PublicKeyType XDR error on real RPC data', () => {
    expect(() => parseAccountSeqNum(REAL_LEDGER_ENTRY_XDR)).not.toThrow();
  });
});
