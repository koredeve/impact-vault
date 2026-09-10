import { privateKeyToAddress, generatePrivateKey } from 'viem/accounts';

const KEYSTORE_KEY = 'impact_vault_keystore_v1';
const SALT = new Uint8Array([73, 109, 112, 97, 99, 116, 86, 97, 117, 108, 116, 83, 97, 108, 116, 50]); // "ImpactVaultSalt2"

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
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem(KEYSTORE_KEY));
}

export function clearSavedKeystore() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(KEYSTORE_KEY);
  }
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

export const SEEDED_CAMPAIGNS_FALLBACK = [
  {
    id: 'genlayer-amm-dex',
    title: 'GenLayer AMM & Concentrated Liquidity DEX',
    category: 'DeFi',
    creator: '0x9C7B65E4701e8D05eD81ffF18dD9B4e69B34ee7B',
    beneficiary: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    description: 'High-throughput decentralized automated market maker utilizing GenLayer AI validator consensus for MEV-resistant swaps, dynamic fee scaling, and natural language limit orders.',
    target_amount: 5000000000000000000n,
    total_funded: 5000000000000000000n,
    total_released: 0n,
    current_milestone_index: 0n,
    total_milestones: 3n,
    status: 'active',
    milestones: [
      {
        title: 'Milestone 1: Mathematical Spec & Core Contracts',
        criteria: 'Complete mathematical specification and smart contracts with unit test coverage > 90%.',
        bps: 3000n,
        status: 'pending',
        deliverable_desc: '',
        evidence_urls: [],
        evaluation_notes: '',
      },
      {
        title: 'Milestone 2: StudioNet Deployment & Web Frontend',
        criteria: 'Deploy working AMM contracts on StudioNet with interactive liquidity pool demo frontend.',
        bps: 3500n,
        status: 'pending',
        deliverable_desc: '',
        evidence_urls: [],
        evaluation_notes: '',
      },
      {
        title: 'Milestone 3: Security Audit & Mainnet Migration',
        criteria: 'Formal security audit completed with all findings resolved.',
        bps: 3500n,
        status: 'pending',
        deliverable_desc: '',
        evidence_urls: [],
        evaluation_notes: '',
      },
    ],
    updates: [
      {
        author: '0x9C7B65E4701e8D05eD81ffF18dD9B4e69B34ee7B',
        update_type: 'CREATOR_LOG',
        text: 'Sprint 1 commenced! Core invariant math completed.',
        timestamp: 1725280000n,
      },
    ],
    backers: [
      {
        address: '0x9C7B65E4701e8D05eD81ffF18dD9B4e69B34ee7B',
        contribution: 2000000000000000000n,
      },
    ],
  },
  {
    id: 'autonomous-sentinel-ai',
    title: 'Autonomous Sentinel — AI Threat Detection Oracle',
    category: 'AI / Agents',
    creator: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    beneficiary: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    description: 'Real-time threat monitoring and autonomous circuit breaker protocol that continuously scans on-chain smart contract mempools to detect flash-loan attacks and exploits.',
    target_amount: 4000000000000000000n,
    total_funded: 4000000000000000000n,
    total_released: 1000000000000000000n,
    current_milestone_index: 1n,
    total_milestones: 3n,
    status: 'active',
    milestones: [
      {
        title: 'Milestone 1: Threat Detection ML Model & Spec',
        criteria: 'Trained threat detection model published with architecture whitepaper and validation benchmarks.',
        bps: 2500n,
        status: 'approved',
        deliverable_desc: 'Published trained Transformer threat detector with automated inference pipeline and formal whitepaper.',
        evidence_urls: ['https://github.com/koredeve/impact-vault'],
        evaluation_notes: 'AI Validator Consensus verified: Transformer threat detection benchmarks satisfied acceptance criteria with 99.2% accuracy.',
      },
      {
        title: 'Milestone 2: Live Oracles & Mempool Streamer',
        criteria: 'Live mempool ingestion oracle running on StudioNet with latency under 1.5 seconds.',
        bps: 4000n,
        status: 'submitted',
        deliverable_desc: 'Deployed real-time mempool listener contracts and telemetry streaming pipeline.',
        evidence_urls: ['https://explorer-studio.genlayer.com/address/0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5'],
        evaluation_notes: '',
      },
      {
        title: 'Milestone 3: Automated Circuit Breakers SDK',
        criteria: 'TypeScript/Python SDK for automatic circuit breaking with 100% test coverage.',
        bps: 3500n,
        status: 'pending',
        deliverable_desc: '',
        evidence_urls: [],
        evaluation_notes: '',
      },
    ],
    updates: [
      {
        author: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        update_type: 'CREATOR_LOG',
        text: 'Milestone 1 approved by validators! Tranche #1 released. Deploying Milestone 2 mempool listeners now.',
        timestamp: 1725380000n,
      },
    ],
    backers: [
      {
        address: '0x9C7B65E4701e8D05eD81ffF18dD9B4e69B34ee7B',
        contribution: 4000000000000000000n,
      },
    ],
  },
  {
    id: 'genlayer-dev-studio',
    title: 'GenLayer Developer Studio & Contract Debugger',
    category: 'Developer Tooling',
    creator: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    beneficiary: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    description: 'Comprehensive IDE extension and browser workspace for compiling, testing, and debugging GenLayer Python intelligent contracts with instant visual trace inspector.',
    target_amount: 3000000000000000000n,
    total_funded: 3000000000000000000n,
    total_released: 3000000000000000000n,
    current_milestone_index: 3n,
    total_milestones: 3n,
    status: 'completed',
    milestones: [
      {
        title: 'Milestone 1: VSCode Extension MVP',
        criteria: 'VSCode extension published on marketplace supporting syntax highlighting and gltest integration.',
        bps: 3333n,
        status: 'approved',
        deliverable_desc: 'Packaged and released GenLayer VSCode development toolchain.',
        evidence_urls: ['https://github.com/koredeve/impact-vault'],
        evaluation_notes: 'AI Validator Consensus verified: Extension syntax highlighting and debugger verified.',
      },
      {
        title: 'Milestone 2: Interactive Consensus Simulator',
        criteria: 'Browser-based consensus visualizer demonstrating leader-validator rounds in real time.',
        bps: 3333n,
        status: 'approved',
        deliverable_desc: 'Built WebGL interactive consensus round visualizer.',
        evidence_urls: ['https://impact-vault-tau.vercel.app'],
        evaluation_notes: 'AI Validator Consensus verified: Interactive round simulator meets visualizer criteria.',
      },
      {
        title: 'Milestone 3: Full Release & Community Tutorials',
        criteria: 'Comprehensive video tutorials and documentation published across official developer channels.',
        bps: 3334n,
        status: 'approved',
        deliverable_desc: 'Published end-to-end tutorial suite and developer guides.',
        evidence_urls: ['https://github.com/koredeve/impact-vault'],
        evaluation_notes: 'AI Validator Consensus verified: All 5 documentation modules approved.',
      },
    ],
    updates: [
      {
        author: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        update_type: 'CREATOR_LOG',
        text: 'Project 100% completed and fully disbursed! Thank you GenLayer validators and community.',
        timestamp: 1725480000n,
      },
    ],
    backers: [
      {
        address: '0x9C7B65E4701e8D05eD81ffF18dD9B4e69B34ee7B',
        contribution: 3000000000000000000n,
      },
    ],
  },
];

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

export function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const ts = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const CATEGORIES = [
  'All Categories',
  'DeFi',
  'AI / Agents',
  'Infrastructure',
  'Public Goods',
  'Security & Audits',
  'Developer Tooling',
];

export const CRITERIA_TEMPLATES = [
  {
    name: 'Open Source Code & Prototype',
    title: 'Milestone 1: Prototype & Test Coverage',
    criteria: 'Public GitHub repository with functional code implementation, architecture docs, and automated unit test suite achieving > 85% branch coverage.',
    defaultBps: 3000,
  },
  {
    name: 'Live StudioNet Deployment',
    title: 'Milestone 2: Testnet Deployment & Frontend DApp',
    criteria: 'Smart contracts deployed on GenLayer StudioNet with verified bytecode and responsive web frontend demo allowing end-user interaction.',
    defaultBps: 3500,
  },
  {
    name: 'Security Audit & Mainnet Readiness',
    title: 'Milestone 3: Security Review & Documentation',
    criteria: 'Comprehensive security audit report published with all high/medium severity findings resolved, accompanied by complete API reference guides.',
    defaultBps: 3500,
  },
];

export function explorerAddressUrl(addr) {
  return `https://explorer-studio.genlayer.com/address/${addr}`;
}

export function explorerTxUrl(txHash) {
  return `https://explorer-studio.genlayer.com/tx/${txHash}`;
}
