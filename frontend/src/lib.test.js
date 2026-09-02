import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateNewPrivateKey,
  addressForPrivateKey,
  saveKeystore,
  loadKeystore,
  truncateHash,
  formatAtto,
  parseEthToAtto,
  formatTimeAgo,
  CATEGORIES,
  CRITERIA_TEMPLATES,
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

  it('formats relative time ago', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatTimeAgo(now - 10)).toBe('just now');
    expect(formatTimeAgo(now - 300)).toBe('5m ago');
    expect(formatTimeAgo(now - 7200)).toBe('2h ago');
    expect(formatTimeAgo(now - 172800)).toBe('2d ago');
  });

  it('exports standard categories and criteria templates', () => {
    expect(CATEGORIES.length).toBeGreaterThan(3);
    expect(CATEGORIES).toContain('DeFi');
    expect(CATEGORIES).toContain('AI / Agents');

    expect(CRITERIA_TEMPLATES.length).toBeGreaterThan(1);
    expect(CRITERIA_TEMPLATES[0].defaultBps).toBe(3000);
  });
});
