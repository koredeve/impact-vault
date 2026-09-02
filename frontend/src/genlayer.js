import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { explorerAddressUrl } from './lib.js';

export const CONTRACT_ADDRESS = '0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5';
export const EXPLORER_URL = explorerAddressUrl(CONTRACT_ADDRESS);

export function makeClient(privateKey) {
  const opts = { chain: studionet };
  if (privateKey) opts.account = createAccount(privateKey);
  return createClient(opts);
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
