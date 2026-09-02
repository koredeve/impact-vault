import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = '0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5';
const pk = '0x1000000000000000000000000000000000000000000000000000000000000001';

const client = createClient({
  chain: studionet,
  account: createAccount(pk),
});

async function write(fn, args, value = 0n) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: fn,
    args,
    value,
  });
  console.log(`Sent ${fn}:`, hash);
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: 'ACCEPTED',
    interval: 2000,
    retries: 45,
  });
  console.log(`${fn} receipt status:`, receipt.status_name);
  return hash;
}

async function main() {
  console.log('Seeding rich demonstration grant vaults on StudioNet...');

  // 1. DeFi AMM DEX
  try {
    await write('create_campaign', [
      'genlayer-amm-dex',
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      'GenLayer AMM & Concentrated Liquidity DEX',
      'DeFi',
      'High-throughput decentralized automated market maker utilizing GenLayer AI validator consensus for MEV-resistant swaps, dynamic fee scaling, and natural language limit orders.',
      5_000_000_000_000_000_000n, // 5 GEN
      [
        'Milestone 1: Mathematical Spec & Core Contracts',
        'Milestone 2: StudioNet Deployment & Web Frontend',
        'Milestone 3: Security Audit & Mainnet Migration',
      ],
      [
        'Complete mathematical specification and smart contracts with unit test coverage > 90%.',
        'Deploy working AMM contracts on StudioNet with interactive liquidity pool demo frontend.',
        'Formal security audit completed with all findings resolved.',
      ],
      [3000n, 3500n, 3500n],
    ]);
  } catch (e) {
    console.log('Campaign 1 error (or exists):', e?.message || e);
  }

  // 2. Autonomous Sentinel AI
  try {
    await write('create_campaign', [
      'autonomous-sentinel-ai',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      'Autonomous Sentinel — AI Threat Detection Oracle',
      'AI / Agents',
      'Real-time threat monitoring and autonomous circuit breaker protocol that continuously scans on-chain smart contract mempools to detect flash-loan attacks and exploits.',
      4_000_000_000_000_000_000n, // 4 GEN
      [
        'Milestone 1: Threat Detection ML Model & Spec',
        'Milestone 2: Live Oracles & Mempool Streamer',
        'Milestone 3: Automated Circuit Breakers SDK',
      ],
      [
        'Trained threat detection model published with architecture whitepaper and validation benchmarks.',
        'Live mempool ingestion oracle running on StudioNet with latency under 1.5 seconds.',
        'TypeScript/Python SDK for automatic circuit breaking with 100% test coverage.',
      ],
      [2500n, 4000n, 3500n],
    ]);
  } catch (e) {
    console.log('Campaign 2 error (or exists):', e?.message || e);
  }

  // 3. Public Goods Developer Tooling
  try {
    await write('create_campaign', [
      'genlayer-dev-studio',
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      'GenLayer Developer Studio & Contract Debugger',
      'Developer Tooling',
      'Comprehensive IDE extension and browser workspace for compiling, testing, and debugging GenLayer Python intelligent contracts with instant visual trace inspector.',
      3_000_000_000_000_000_000n, // 3 GEN
      [
        'Milestone 1: VSCode Extension MVP',
        'Milestone 2: Interactive Consensus Simulator',
        'Milestone 3: Full Release & Community Tutorials',
      ],
      [
        'VSCode extension published on marketplace supporting syntax highlighting and gltest integration.',
        'Browser-based consensus visualizer demonstrating leader-validator rounds in real time.',
        'Comprehensive video tutorials and documentation published across official developer channels.',
      ],
      [3333n, 3333n, 3334n],
    ]);
  } catch (e) {
    console.log('Campaign 3 error (or exists):', e?.message || e);
  }

  // Add initial backer contribution to Campaign 1
  try {
    await write('fund_campaign', ['genlayer-amm-dex'], 2_000_000_000_000_000_000n); // 2 GEN
    await write('post_campaign_update', ['genlayer-amm-dex', 'Sprint 1 commenced! Core invariant math completed.']);
  } catch (e) {
    console.log('Fund/update error:', e?.message || e);
  }

  console.log('All demo grant vaults seeded!');
}

main();
