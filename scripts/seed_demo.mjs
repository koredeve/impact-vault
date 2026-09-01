import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = '0xbB5D0451189E360165908567e8B9EfA209D386E6';
// Burner deployer private key
const pk = '0x1000000000000000000000000000000000000000000000000000000000000001';

const client = createClient({
  chain: studionet,
  account: createAccount(pk),
});

async function main() {
  console.log('Seeding initial campaign on StudioNet...');
  try {
    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'create_campaign',
      args: [
        'genlayer-dex-grant-2026',
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        'GenLayer Automated Market Maker & DEX',
        'Decentralized exchange and liquidity pool protocol utilizing GenLayer intelligent consensus for MEV-resistant swaps and natural-language limit orders.',
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
      ],
    });
    console.log('Transaction sent:', txHash);
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: 'ACCEPTED',
      interval: 2000,
      retries: 45,
    });
    console.log('Receipt status:', receipt.status_name);
  } catch (e) {
    console.error('Seed error:', e);
  }
}

main();
