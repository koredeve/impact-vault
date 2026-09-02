import { describe, it, expect, vi } from 'vitest';
import {
  makeClient,
  makeExtensionClient,
  switchOrAddStudioNet,
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
  STUDIONET_CHAIN_ID_HEX,
} from './genlayer.js';

describe('ImpactVault GenLayer Client & Dual-Signing Architecture', () => {
  it('instantiates local account client for signed writes', () => {
    const testPk = '0x1000000000000000000000000000000000000000000000000000000000000001';
    const client = makeClient(testPk);
    expect(client).toBeDefined();
    expect(client.account).toBeDefined();
    expect(client.account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('instantiates browser extension provider client for signed writes', () => {
    const mockProvider = {
      request: vi.fn(),
    };
    const mockAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const extClient = makeExtensionClient(mockAddr, mockProvider);
    expect(extClient).toBeDefined();
    expect(extClient.account.address.toLowerCase()).toBe(mockAddr.toLowerCase());
  });

  it('switches or adds GenLayer StudioNet network via EIP-3085 / EIP-3326', async () => {
    const mockRequest = vi.fn().mockRejectedValueOnce({ code: 4902, message: 'Unrecognized chain' })
      .mockResolvedValueOnce(null);
    const mockProvider = { request: mockRequest };

    await switchOrAddStudioNet(mockProvider);
    expect(mockRequest).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
    expect(mockRequest).toHaveBeenCalledWith({
      method: 'wallet_addEthereumChain',
      params: [
        expect.objectContaining({
          chainId: STUDIONET_CHAIN_ID_HEX,
          chainName: 'GenLayer StudioNet',
        }),
      ],
    });
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
