import React, { useState, useEffect } from 'react';
import {
  makeClient,
  makeExtensionClient,
  readPlatformMetrics,
  listCampaignIds,
  readCampaign,
  readMilestonesCount,
  readMilestone,
  readCampaignUpdates,
  readCredits,
  writeAndWait,
  CONTRACT_ADDRESS,
  EXPLORER_URL,
} from './genlayer.js';
import { WalletHeader } from './components/WalletHeader.jsx';
import { CampaignCard } from './components/CampaignCard.jsx';
import { CampaignDetailModal } from './components/CampaignDetailModal.jsx';
import { CreateCampaignModal } from './components/CreateCampaignModal.jsx';
import { CriteriaAssistantModal } from './components/CriteriaAssistantModal.jsx';
import { SubmitDeliverableModal } from './components/SubmitDeliverableModal.jsx';
import { truncateHash, formatAtto, explorerTxUrl, CATEGORIES } from './lib.js';

export function App() {
  const [client, setClient] = useState(() => makeClient(null));
  const [me, setMe] = useState(null);
  const [credits, setCredits] = useState(0n);
  const [metrics, setMetrics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tx, setTx] = useState(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' or 'my'
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'funding', 'active', 'completed', 'cancelled'

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [presetMilestones, setPresetMilestones] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [deliverableModalState, setDeliverableModalState] = useState(null); // { campaignId, milestoneIdx }

  useEffect(() => {
    fetchMetrics();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (me) {
      fetchCredits(me);
    } else {
      setCredits(0n);
    }
  }, [me]);

  async function fetchMetrics() {
    const data = await readPlatformMetrics(client);
    if (data) setMetrics(data);
  }

  async function fetchCredits(address) {
    try {
      const amt = await readCredits(client, address);
      setCredits(amt || 0n);
    } catch {
      setCredits(0n);
    }
  }

  async function fetchCampaigns() {
    setLoading(true);
    setError('');
    try {
      const ids = await listCampaignIds(client);
      const list = await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await readCampaign(client, id);
            return { id, ...data };
          } catch {
            return null;
          }
        })
      );
      setCampaigns(list.filter(Boolean));
    } catch (err) {
      setError('Failed to load campaigns from StudioNet.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign(formData) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy('create');
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(
        client,
        'create_campaign',
        [
          formData.id,
          formData.title,
          formData.description,
          formData.category,
          formData.beneficiary,
          formData.targetAmountAtto,
          formData.milestoneBps,
          formData.milestoneCriteria,
        ],
        0n
      );
      setTx({ hash, label: `Created grant vault "${formData.title}"` });
      setCreateModalOpen(false);
      await fetchCampaigns();
      await fetchMetrics();
    } catch (err) {
      setError(err?.message || 'Failed to create campaign');
    } finally {
      setBusy('');
    }
  }

  async function handleFundCampaign(campaignId, attoAmount) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy(`fund_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'fund_campaign', [campaignId], attoAmount);
      setTx({ hash, label: `Contributed ${formatAtto(attoAmount)} GEN to vault` });
      await fetchCampaigns();
      await fetchMetrics();
    } catch (err) {
      setError(err?.message || 'Funding failed');
    } finally {
      setBusy('');
    }
  }

  async function handleSubmitDeliverable(campaignId, milestoneIdx, proofUrl, description) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy(`submit_${campaignId}_${milestoneIdx}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(
        client,
        'submit_deliverable',
        [campaignId, BigInt(milestoneIdx), proofUrl, description],
        0n
      );
      setTx({ hash, label: `Submitted proof for Milestone #${milestoneIdx + 1}` });
      setDeliverableModalState(null);
      await fetchCampaigns();
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaign(client, campaignId);
        setSelectedCampaign({ id: campaignId, ...fresh });
      }
    } catch (err) {
      setError(err?.message || 'Submission failed');
    } finally {
      setBusy('');
    }
  }

  async function handleEvaluateMilestone(campaignId, milestoneIdx) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy(`eval_${campaignId}_${milestoneIdx}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(
        client,
        'evaluate_milestone',
        [campaignId, BigInt(milestoneIdx)],
        0n
      );
      setTx({ hash, label: `AI Consensus completed for Milestone #${milestoneIdx + 1}` });
      await fetchCampaigns();
      await fetchMetrics();
      if (me) await fetchCredits(me);
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaign(client, campaignId);
        setSelectedCampaign({ id: campaignId, ...fresh });
      }
    } catch (err) {
      setError(err?.message || 'Milestone AI consensus failed');
    } finally {
      setBusy('');
    }
  }

  async function handlePostUpdate(campaignId, text) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy(`update_${campaignId}`);
    setError('');
    try {
      await writeAndWait(client, 'post_campaign_update', [campaignId, text], 0n);
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaign(client, campaignId);
        setSelectedCampaign({ id: campaignId, ...fresh });
      }
    } catch (err) {
      setError(err?.message || 'Failed to post update');
    } finally {
      setBusy('');
    }
  }

  async function handlePostBackerNote(campaignId, text) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy(`note_${campaignId}`);
    setError('');
    try {
      await writeAndWait(client, 'post_backer_note', [campaignId, text], 0n);
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaign(client, campaignId);
        setSelectedCampaign({ id: campaignId, ...fresh });
      }
    } catch (err) {
      setError(err?.message || 'Failed to post backer note');
    } finally {
      setBusy('');
    }
  }

  async function handleCancelCampaign(campaignId) {
    if (!confirm('Are you sure you want to cancel this campaign? Backers will be eligible for pro-rata refunds.')) return;
    setBusy(`cancel_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'cancel_campaign', [campaignId], 0n);
      setTx({ hash, label: `Cancelled campaign ${campaignId}` });
      await fetchCampaigns();
      await fetchMetrics();
    } catch (err) {
      setError(err?.message || 'Cancellation failed');
    } finally {
      setBusy('');
    }
  }

  async function handleClaimRefund(campaignId) {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy(`refund_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'claim_pro_rata_refund', [campaignId], 0n);
      setTx({ hash, label: `Claimed pro-rata refund for ${campaignId}` });
      await fetchCampaigns();
      await fetchCredits(me);
    } catch (err) {
      setError(err?.message || 'Refund claim failed');
    } finally {
      setBusy('');
    }
  }

  async function handleClaimPayout() {
    if (!me) {
      alert('Please connect your browser wallet (MetaMask / Rabby) first.');
      return;
    }
    setBusy('claim_payout');
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'claim_payout', [], 0n);
      setTx({ hash, label: `Withdrew ${formatAtto(credits)} GEN to your wallet` });
      setCredits(0n);
    } catch (err) {
      setError(err?.message || 'Withdrawal failed');
    } finally {
      setBusy('');
    }
  }

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedCategory !== 'All Categories' && c.category !== selectedCategory) return false;
    if (statusFilter !== 'all' && c.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchId = c.id?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId) return false;
    }
    return true;
  });

  const myCampaigns = campaigns.filter(
    (c) => me && (c.creator?.toLowerCase() === me.toLowerCase() || c.beneficiary?.toLowerCase() === me.toLowerCase())
  );

  return (
    <div className="wrap">
      <header>
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div className="brand" style={{ margin: 0 }}>
            <span className="logo" style={{ fontSize: 32 }}>🎯</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.02em' }}>ImpactVault</h1>
              <p className="addr" style={{ margin: '2px 0 0', fontSize: 12 }}>
                Contract:{' '}
                <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
                  {truncateHash(CONTRACT_ADDRESS, 8, 6)}
                </a>{' '}
                · StudioNet
              </p>
            </div>
          </div>

          <WalletHeader
            me={me}
            onConnect={(address, provider) => {
              setClient(makeExtensionClient(address, provider));
              setMe(address);
            }}
            onDisconnect={() => {
              setClient(makeClient(null));
              setMe(null);
            }}
          />
        </div>

        <div className="hero-desc" style={{ marginTop: 8 }}>
          <p className="sub" style={{ margin: 0, fontSize: 14 }}>
            Milestone-gated Web3 grant & crowdfunding protocol on GenLayer. Capital is locked in sequential
            tranches and trustlessly released only when AI-validators verify that off-chain deliverables satisfy immutable criteria.
          </p>
        </div>

        {metrics && (
          <div className="metrics-banner">
            <div className="metric-box">
              <div className="metric-label">Total Vault TVL</div>
              <div className="metric-val" style={{ color: 'var(--cyan)' }}>{formatAtto(metrics.tvl_atto)} GEN</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Total Disbursed</div>
              <div className="metric-val" style={{ color: 'var(--ok)' }}>{formatAtto(metrics.total_released_atto)} GEN</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Active Grant Vaults</div>
              <div className="metric-val">{Number(metrics.active_campaigns)}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Completed Projects</div>
              <div className="metric-val" style={{ color: 'var(--accent-hover)' }}>{Number(metrics.completed_campaigns)}</div>
            </div>
          </div>
        )}
      </header>

      {credits > 0n && (
        <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div>
            <strong>💰 Unclaimed Beneficiary Payout Available:</strong> {formatAtto(credits)} GEN
          </div>
          <button className="success" style={{ padding: '6px 14px', fontSize: 13 }} onClick={handleClaimPayout} disabled={Boolean(busy)}>
            {busy === 'claim_payout' ? 'Claiming…' : 'Withdraw to Wallet'}
          </button>
        </div>
      )}

      {tx && (
        <div className="notice" style={{ marginTop: 16 }}>
          <div className="notice-header">
            <span>{tx.label}</span>
            <button className="ghost" style={{ padding: '0 6px', fontSize: 12 }} onClick={() => setTx(null)}>✕</button>
          </div>
          {tx.hash && (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Tx Hash:{' '}
              <a href={explorerTxUrl(tx.hash)} target="_blank" rel="noreferrer" className="mono">
                {truncateHash(tx.hash, 12, 10)}
              </a>
            </div>
          )}
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="toolbar-wrap">
        <div className="toolbar-tabs">
          <button className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
            🌐 Explore Grant Vaults ({campaigns.length})
          </button>
          {me && (
            <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
              💼 My Vaults ({myCampaigns.length})
            </button>
          )}
        </div>

        <div className="toolbar-actions">
          <button className="ghost" style={{ fontSize: 13, flex: '1 1 auto' }} onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="ghost" style={{ fontSize: 13, flex: '1 1 auto' }} onClick={() => setAssistantModalOpen(true)}>
            ✨ Criteria Assistant
          </button>
          <button style={{ flex: '1 1 auto' }} onClick={() => setCreateModalOpen(true)} disabled={!me}>
            + Launch Grant Vault
          </button>
        </div>
      </div>

      {activeTab === 'explore' && (
        <div>
          {/* Category Filter Chips */}
          <div className="category-chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Status Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              placeholder="Search grant vaults by name, keyword, or identifier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 2 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 150 }}
            >
              <option value="all">All States</option>
              <option value="funding">Funding State</option>
              <option value="active">Active Execution</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ marginTop: 16 }} />
      ) : activeTab === 'explore' ? (
        filteredCampaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p className="hint">No grant vaults match your selected category and filters.</p>
            <button onClick={() => setCreateModalOpen(true)} disabled={!me} style={{ marginTop: 8 }}>
              🚀 Launch First Grant Vault
            </button>
          </div>
        ) : (
          <div className="campaign-grid">
            {filteredCampaigns.map((camp) => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                me={me}
                onSelect={(c) => setSelectedCampaign(c)}
                onFund={handleFundCampaign}
                onSubmitDeliverable={(c, idx, m) => setDeliverableModalData({ campaign: c, milestoneIdx: idx, milestone: m })}
                onEvaluateMilestone={handleEvaluateMilestone}
                onCancel={handleCancelCampaign}
                onClaimRefund={handleClaimRefund}
                busy={busy}
              />
            ))}
          </div>
        )
      ) : (
        myCampaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p className="hint">You have not created or backed any grant vaults yet.</p>
            <button onClick={() => setCreateModalOpen(true)} disabled={!me} style={{ marginTop: 8 }}>
              🚀 Launch Grant Vault
            </button>
          </div>
        ) : (
          <div className="campaign-grid">
            {myCampaigns.map((camp) => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                me={me}
                onSelect={(c) => setSelectedCampaign(c)}
                onFund={handleFundCampaign}
                onSubmitDeliverable={(c, idx, m) => setDeliverableModalData({ campaign: c, milestoneIdx: idx, milestone: m })}
                onEvaluateMilestone={handleEvaluateMilestone}
                onCancel={handleCancelCampaign}
                onClaimRefund={handleClaimRefund}
                busy={busy}
              />
            ))}
          </div>
        )
      )}

      {/* Deep Drill-Down Campaign Detail Modal */}
      <CampaignDetailModal
        isOpen={Boolean(selectedCampaign)}
        onClose={() => setSelectedCampaign(null)}
        campaign={selectedCampaign}
        me={me}
        onFund={handleFundCampaign}
        onSubmitDeliverable={(c, idx, m) => setDeliverableModalData({ campaign: c, milestoneIdx: idx, milestone: m })}
        onEvaluateMilestone={handleEvaluateMilestone}
        onCancel={handleCancelCampaign}
        onClaimRefund={handleClaimRefund}
        onPostUpdate={handlePostUpdate}
        onPostNote={handlePostNote}
        busy={busy}
      />

      {/* Creation Wizard */}
      <CreateCampaignModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setPresetMilestones(null);
        }}
        onCreate={handleCreateCampaign}
        onOpenAssistant={() => setAssistantModalOpen(true)}
        presetMilestones={presetMilestones}
        busy={busy === 'create'}
      />

      {/* AI Criteria Assistant */}
      <CriteriaAssistantModal
        isOpen={assistantModalOpen}
        onClose={() => setAssistantModalOpen(false)}
        onApplyCriteria={(milestones) => {
          setPresetMilestones(milestones);
          setCreateModalOpen(true);
        }}
      />

      {/* Milestone Deliverable Submission */}
      <SubmitDeliverableModal
        isOpen={Boolean(deliverableModalData)}
        onClose={() => setDeliverableModalData(null)}
        campaign={deliverableModalData?.campaign}
        milestoneIdx={deliverableModalData?.milestoneIdx}
        milestone={deliverableModalData?.milestone}
        onSubmit={handleSubmitDeliverable}
        busy={busy === 'submit_deliverable'}
      />

      <footer>
        <p>Built natively for GenLayer StudioNet · Non-Deterministic AI Validator Consensus</p>
      </footer>
    </div>
  );
}
