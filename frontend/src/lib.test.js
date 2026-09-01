import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateNewPrivateKey,
  addressForPrivateKey,
  saveKeystore,
  loadKeystore,
  truncateHash,
  formatAtto,
  parseEthToAtto,
} from './lib.js';

beforeEach(() => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
});

describe('ImpactVault lib utilities', () => {
  it('generates valid private key and derives Ethereum/GenLayer address', () => {
    const pk = generateNewPrivateKey();
    expect(pk).toMatch(/^0x[a-fA-F0-9]{64}$/);
    const addr = addressForPrivateKey(pk);
    expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('encrypts and decrypts keystore with AES-GCM password', async () => {
    const pk = generateNewPrivateKey();
    const pwd = 'StrongTestPassword123!';
    const addr = await saveKeystore(pwd, pk);
    expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);

    const decrypted = await loadKeystore(pwd);
    expect(decrypted.toLowerCase()).toBe(pk.toLowerCase());
  });

  it('formats atto and parses eth correctly', () => {
    const tenEthAtto = 10_000_000_000_000_000_000n;
    expect(formatAtto(tenEthAtto)).toBe('10.00');

    const parsed = parseEthToAtto('2.5');
    expect(parsed).toBe(2_500_000_000_000_000_000n);
  });

  it('truncates hash strings properly', () => {
    const hash = '0x1234567890abcdef1234567890abcdef12345678';
    const truncated = truncateHash(hash, 6, 4);
    expect(truncated).toBe('0x1234…5678');
  });
});
