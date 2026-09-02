import { describe, it, expect, vi } from 'vitest';
import {
  makeClient,
  readPlatformMetrics,
  listCampaignIds,
  readCampaign,
  readMilestonesCount,
  readMilestone,
  readCampaignUpdates,
  readCampaignBackers,
  readCredits,
  writeAndWait,
  CONTRACT_ADDRESS,
} from './genlayer.js';

describe('ImpactVault GenLayer Client & Signed Writes', () => {
  it('instantiates client with account for signed writes', () => {
    const testPk = '0x1000000000000000000000000000000000000000000000000000000000000001';
    const client = makeClient(testPk);
    expect(client).toBeDefined();
    expect(client.account).toBeDefined();
    expect(client.account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('executes signed contract writes and waits for ACCEPTED receipt', async () => {
    const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const mockWriteContract = vi.fn().mockResolvedValue(mockTxHash);
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status_name: 'ACCEPTED',
      tx_hash: mockTxHash,
    });

    const mockClient = {
      writeContract: mockWriteContract,
      waitForTransactionReceipt: mockWaitForReceipt,
    };

    const hash = await writeAndWait(
      mockClient,
      'fund_campaign',
      ['genlayer-amm-dex'],
      1_000_000_000_000_000_000n
    );

    expect(hash).toBe(mockTxHash);
    expect(mockWriteContract).toHaveBeenCalledWith({
      address: CONTRACT_ADDRESS,
      functionName: 'fund_campaign',
      args: ['genlayer-amm-dex'],
      value: 1_000_000_000_000_000_000n,
    });
    expect(mockWaitForReceipt).toHaveBeenCalledWith({
      hash: mockTxHash,
      status: 'ACCEPTED',
      interval: 2000,
      retries: 45,
    });
  });

  it('reads platform metrics and campaign data correctly', async () => {
    const mockReadContract = vi.fn().mockImplementation(({ functionName }) => {
      if (functionName === 'get_platform_metrics') {
        return Promise.resolve({
          tvl_atto: 2000000000000000000n,
          total_released_atto: 0n,
          active_campaigns: 1n,
          completed_campaigns: 0n,
        });
      }
      if (functionName === 'get_campaign_ids') {
        return Promise.resolve({ ids: ['genlayer-amm-dex'] });
      }
      return Promise.resolve(null);
    });

    const mockClient = { readContract: mockReadContract };
    const metrics = await readPlatformMetrics(mockClient);
    expect(metrics.tvl_atto).toBe(2000000000000000000n);

    const ids = await listCampaignIds(mockClient);
    expect(ids).toEqual(['genlayer-amm-dex']);
  });
});
