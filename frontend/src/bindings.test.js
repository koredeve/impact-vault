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
  readCampaignFull,
  readAllCampaignsFull,
  readCredits,
  writeAndWait,
  CONTRACT_ADDRESS,
  STUDIONET_CHAIN_ID_HEX,
} from './genlayer.js';

describe('ImpactVault GenLayer Client & Contract Call Signatures', () => {
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

  it('executes create_campaign with exact 9-argument contract payload', async () => {
    const mockTxHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
    const mockWriteContract = vi.fn().mockResolvedValue(mockTxHash);
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status_name: 'ACCEPTED',
      tx_hash: mockTxHash,
    });
    const mockClient = { writeContract: mockWriteContract, waitForTransactionReceipt: mockWaitForReceipt };

    const payload = [
      'new-grant-slug',
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      'New Grant Project',
      'DeFi',
      'Full Description of Grant',
      5_000_000_000_000_000_000n,
      ['Milestone 1', 'Milestone 2'],
      ['Criteria 1', 'Criteria 2'],
      [5000n, 5000n],
    ];

    const hash = await writeAndWait(mockClient, 'create_campaign', payload, 0n);
    expect(hash).toBe(mockTxHash);
    expect(mockWriteContract).toHaveBeenCalledWith({
      address: CONTRACT_ADDRESS,
      functionName: 'create_campaign',
      args: payload,
      value: 0n,
    });
  });

  it('executes submit_deliverable with exact 4-argument contract payload', async () => {
    const mockTxHash = '0x2222222222222222222222222222222222222222222222222222222222222222';
    const mockWriteContract = vi.fn().mockResolvedValue(mockTxHash);
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status_name: 'ACCEPTED',
      tx_hash: mockTxHash,
    });
    const mockClient = { writeContract: mockWriteContract, waitForTransactionReceipt: mockWaitForReceipt };

    const payload = [
      'genlayer-amm-dex',
      0n,
      'Implemented concentrated liquidity math and tests',
      ['https://github.com/koredeve/impact-vault/commit/123456'],
    ];

    const hash = await writeAndWait(mockClient, 'submit_deliverable', payload, 0n);
    expect(hash).toBe(mockTxHash);
    expect(mockWriteContract).toHaveBeenCalledWith({
      address: CONTRACT_ADDRESS,
      functionName: 'submit_deliverable',
      args: payload,
      value: 0n,
    });
  });

  it('executes fund_campaign and waits for ACCEPTED receipt', async () => {
    const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const mockWriteContract = vi.fn().mockResolvedValue(mockTxHash);
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status_name: 'ACCEPTED',
      tx_hash: mockTxHash,
    });
    const mockClient = { writeContract: mockWriteContract, waitForTransactionReceipt: mockWaitForReceipt };

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
  });

  it('reads full campaign objects including nested milestones, updates, and backers', async () => {
    const mockReadContract = vi.fn().mockImplementation(({ functionName, args }) => {
      if (functionName === 'get_campaign') {
        return Promise.resolve({
          creator: '0x1111111111111111111111111111111111111111',
          beneficiary: '0x2222222222222222222222222222222222222222',
          title: 'Full Test Campaign',
          category: 'DeFi',
          description: 'Testing full milestone loading',
          target_amount: 5000000000000000000n,
          total_funded: 2000000000000000000n,
          total_released: 0n,
          current_milestone_index: 0n,
          total_milestones: 2n,
          status: 'active',
          created_at: 1725280000n,
        });
      }
      if (functionName === 'get_milestone') {
        const idx = Number(args[1]);
        return Promise.resolve({
          title: `Milestone #${idx + 1}`,
          criteria: `Criteria for #${idx + 1}`,
          bps: 5000n,
          status: 'pending',
          deliverable_desc: '',
          evidence_urls: [],
          evaluation_notes: '',
        });
      }
      if (functionName === 'get_campaign_updates') {
        return Promise.resolve({ updates: [] });
      }
      if (functionName === 'get_campaign_backers') {
        return Promise.resolve({ backers: [] });
      }
      if (functionName === 'get_campaign_ids') {
        return Promise.resolve({ ids: ['full-test-campaign'] });
      }
      return Promise.resolve(null);
    });

    const mockClient = { readContract: mockReadContract };
    const fullCampaign = await readCampaignFull(mockClient, 'full-test-campaign');
    expect(fullCampaign).toBeDefined();
    expect(fullCampaign.milestones).toHaveLength(2);
    expect(fullCampaign.milestones[0].title).toBe('Milestone #1');
    expect(fullCampaign.milestones[1].title).toBe('Milestone #2');

    const allFull = await readAllCampaignsFull(mockClient);
    expect(allFull).toHaveLength(1);
    expect(allFull[0].milestones).toHaveLength(2);
  });
});
