import { privateKeyToAddress, generatePrivateKey } from 'viem/accounts';

const KEYSTORE_KEY = 'impact_vault_keystore_v1';
const SALT = new Uint8Array([73, 109, 112, 97, 99, 116, 86, 97, 117, 108, 116, 83, 97, 108, 116, 49]); // "ImpactVaultSalt1"

async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function saveKeystore(password, privateKey) {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(privateKey)
  );
  const payload = {
    iv: Array.from(iv),
    cipher: Array.from(new Uint8Array(cipher)),
    address: privateKeyToAddress(privateKey),
  };
  localStorage.setItem(KEYSTORE_KEY, JSON.stringify(payload));
  return payload.address;
}

export async function loadKeystore(password) {
  const raw = localStorage.getItem(KEYSTORE_KEY);
  if (!raw) return null;
  const payload = JSON.parse(raw);
  const key = await deriveKey(password);
  const iv = new Uint8Array(payload.iv);
  const cipher = new Uint8Array(payload.cipher);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
  const dec = new TextDecoder();
  return dec.decode(plain);
}

export function hasSavedKeystore() {
  return Boolean(localStorage.getItem(KEYSTORE_KEY));
}

export function clearSavedKeystore() {
  localStorage.removeItem(KEYSTORE_KEY);
}

export function generateNewPrivateKey() {
  return generatePrivateKey();
}

export function addressForPrivateKey(pk) {
  return privateKeyToAddress(pk);
}

export function truncateHash(hash, head = 6, tail = 4) {
  if (!hash) return '';
  const s = String(hash);
  if (s.length <= head + tail) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function formatAtto(atto) {
  if (atto === undefined || atto === null) return '0.00';
  const bi = typeof atto === 'bigint' ? atto : BigInt(String(atto));
  const eth = Number(bi) / 1e18;
  return eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function parseEthToAtto(eth) {
  const val = parseFloat(eth);
  if (isNaN(val) || val <= 0) return 0n;
  return BigInt(Math.floor(val * 1e18));
}

export function explorerAddressUrl(addr) {
  return `https://explorer-studio.genlayer.com/address/${addr}`;
}

export function explorerTxUrl(txHash) {
  return `https://explorer-studio.genlayer.com/tx/${txHash}`;
}
