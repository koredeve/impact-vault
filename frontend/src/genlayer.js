import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { explorerAddressUrl, SEEDED_CAMPAIGNS_FALLBACK } from './lib.js';

export const CONTRACT_ADDRESS = '0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5';
export const EXPLORER_URL = explorerAddressUrl(CONTRACT_ADDRESS);

export const STUDIONET_CHAIN_ID_HEX = '0xf22f'; // 61999 in hex (matches StudioNet RPC eth_chainId)

export async function switchOrAddStudioNet(provider) {
  if (!provider || typeof provider.request !== 'function') return;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // 4902 error code indicates the chain has not been added to MetaMask
    if (
      switchError.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.includes('Unrecognized') ||
      switchError?.message?.includes('wallet_addEthereumChain')
    ) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: 'GenLayer StudioNet',
            nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
            rpcUrls: ['https://studio.genlayer.com/api'],
            blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
          },
        ],
      });
    } else {
      console.warn('Network switch warning:', switchError);
    }
  }
}

export function makeClient(privateKey) {
  const opts = { chain: studionet };
  if (privateKey) opts.account = createAccount(privateKey);
  return createClient(opts);
}

export function makeExtensionClient(address, provider = window.ethereum) {
  return createClient({
    chain: studionet,
    provider: provider,
    account: address,
  });
}

export async function readPlatformMetrics(client) {
  try {
    return await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_platform_metrics',
      args: [],
    });
  } catch (e) {
    console.error('readPlatformMetrics failed:', e);
    return null;
  }
}

export async function listCampaignIds(client) {
  try {
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_campaign_ids',
      args: [],
    });
    return Array.isArray(res?.ids) ? res.ids : [];
  } catch (e) {
    console.error('listCampaignIds failed:', e);
    return [];
  }
}

export async function readCampaign(client, campaignId) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_campaign',
    args: [campaignId],
  });
}

export async function readMilestonesCount(client, campaignId) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_milestones_count',
    args: [campaignId],
  });
}

export async function readMilestone(client, campaignId, milestoneIdx) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_milestone',
    args: [campaignId, milestoneIdx],
  });
}

export async function readCampaignUpdates(client, campaignId) {
  try {
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_campaign_updates',
      args: [campaignId],
    });
    return Array.isArray(res?.updates) ? res.updates : [];
  } catch {
    return [];
  }
}

export async function readCampaignBackers(client, campaignId) {
  try {
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_campaign_backers',
      args: [campaignId],
    });
    return Array.isArray(res?.backers) ? res.backers : [];
  } catch {
    return [];
  }
}

export async function readBackerContribution(client, campaignId, backerAddr) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_backer_contribution',
    args: [campaignId, backerAddr],
  });
}

export async function readCredits(client, addr) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_credits',
    args: [addr],
  });
}

export async function readCampaignFull(client, campaignId) {
  const fallback = SEEDED_CAMPAIGNS_FALLBACK.find((c) => c.id === campaignId);

  try {
    const camp = await readCampaign(client, campaignId);
    if (!camp) return fallback || null;

    const totalM = Number(camp.total_milestones || 0n);
    const milestonePromises = [];
    for (let i = 0; i < totalM; i++) {
      milestonePromises.push(
        readMilestone(client, campaignId, BigInt(i)).catch((err) => {
          console.warn(`Failed to load milestone #${i} for ${campaignId}:`, err);
          return null;
        })
      );
    }

    const [fetchedMilestones, updates, backers] = await Promise.all([
      Promise.all(milestonePromises),
      readCampaignUpdates(client, campaignId).catch(() => []),
      readCampaignBackers(client, campaignId).catch(() => []),
    ]);

    const finalMilestones = [];
    for (let i = 0; i < totalM; i++) {
      const m = fetchedMilestones[i] || fallback?.milestones?.[i] || null;
      if (m) finalMilestones.push(m);
    }

    return {
      id: campaignId,
      ...camp,
      milestones: finalMilestones.length > 0 ? finalMilestones : (fallback?.milestones || []),
      updates: Array.isArray(updates) && updates.length > 0 ? updates : (fallback?.updates || []),
      backers: Array.isArray(backers) && backers.length > 0 ? backers : (fallback?.backers || []),
    };
  } catch (err) {
    console.error(`readCampaignFull failed for ${campaignId}:`, err);
    return fallback || null;
  }
}

export async function readAllCampaignsFull(client) {
  try {
    const ids = await listCampaignIds(client);
    const uniqueIds = Array.from(new Set([...(ids || []), ...SEEDED_CAMPAIGNS_FALLBACK.map((s) => s.id)]));
    const list = [];
    for (const id of uniqueIds) {
      const camp = await readCampaignFull(client, id);
      if (camp) list.push(camp);
    }
    return list.length > 0 ? list : SEEDED_CAMPAIGNS_FALLBACK;
  } catch (err) {
    console.error('readAllCampaignsFull failed:', err);
    return SEEDED_CAMPAIGNS_FALLBACK;
  }
}

export async function writeAndWait(client, functionName, args = [], value = 0n) {
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'ACCEPTED',
    interval: 2000,
    retries: 45,
  });
  return txHash;
}
