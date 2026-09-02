import React, { useState, useEffect } from 'react';
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
  EXPLORER_URL,
} from './genlayer.js';
import { WalletCard } from './components/WalletCard.jsx';
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
  const [deliverableModalData, setDeliverableModalData] = useState(null);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      // Platform metrics
      const platMetrics = await readPlatformMetrics(client);
      setMetrics(platMetrics);

      // Campaign list
      const ids = await listCampaignIds(client);
      const items = [];
      for (const id of ids) {
        try {
          const c = await readCampaign(client, id);
          const count = await readMilestonesCount(client, id);
          const milestones = [];
          for (let i = 0; i < Number(count); i++) {
            try {
              milestones.push(await readMilestone(client, id, BigInt(i)));
            } catch (err) {
              console.error(`Failed to read milestone ${i} for ${id}:`, err);
            }
          }
          const updates = await readCampaignUpdates(client, id);
          const backers = await readCampaignBackers(client, id);
          const campObj = { id, ...c, milestones, updates, backers };
          items.push(campObj);

          // Update selected campaign if currently open
          if (selectedCampaign && selectedCampaign.id === id) {
            setSelectedCampaign(campObj);
          }
        } catch (err) {
          console.error(`Failed to read campaign ${id}:`, err);
        }
      }
      setCampaigns(items);

      if (me) {
        try {
          const cred = await readCredits(client, me);
          setCredits(BigInt(cred));
        } catch {
          setCredits(0n);
        }
      } else {
        setCredits(0n);
      }
    } catch (e) {
      setError('Failed to refresh data: ' + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [me]);

  async function handleCreateCampaign(data) {
    setBusy('create');
    setError('');
    try {
      const hash = await writeAndWait(client, 'create_campaign', [
        data.cid,
        data.beneficiary,
        data.title,
        data.category,
        data.desc,
        data.targetAtto,
        data.titles,
        data.criteria,
        data.bpsArray,
      ]);
      setTx({ label: `Grant vault "${data.title}" successfully launched on StudioNet!`, hash });
      setCreateModalOpen(false);
      await refresh();
    } catch (e) {
      setError('Create campaign failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleFundCampaign(campaignId, amountAtto) {
    if (!me) {
      setError('Please connect your wallet first.');
      return;
    }
    setBusy(`fund_${campaignId}`);
    setError('');
    try {
      const hash = await writeAndWait(client, 'fund_campaign', [campaignId], amountAtto);
      setTx({ label: `Successfully contributed to grant vault #${campaignId}!`, hash });
      await refresh();
    } catch (e) {
      setError('Funding failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleSubmitDeliverable(data) {
    setBusy('submit_deliverable');
    setError('');
    try {
      const hash = await writeAndWait(client, 'submit_deliverable', [
        data.campaignId,
        BigInt(data.milestoneIdx),
        data.desc,
        data.evidenceUrls,
      ]);
      setTx({ label: 'Milestone deliverable submitted on-chain for AI evaluation!', hash });
      setDeliverableModalData(null);
      await refresh();
    } catch (e) {
      setError('Deliverable submission failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleEvaluateMilestone(campaignId, milestoneIdx) {
    setBusy(`eval_${campaignId}`);
    setError('');
    setTx({
      label: `GenLayer AI Validators are fetching evidence & evaluating Milestone #${milestoneIdx + 1}…`,
      hash: null,
    });
    try {
      const hash = await writeAndWait(client, 'evaluate_milestone', [campaignId, BigInt(milestoneIdx)]);
      setTx({ label: `Milestone #${milestoneIdx + 1} evaluation finalized by AI consensus!`, hash });
      await refresh();
    } catch (e) {
      setError('Milestone evaluation failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handlePostUpdate(campaignId, text) {
    setBusy(`update_${campaignId}`);
    setError('');
    try {
      const hash = await writeAndWait(client, 'post_campaign_update', [campaignId, text]);
      setTx({ label: 'Creator development log published on-chain!', hash });
      await refresh();
    } catch (e) {
      setError('Post update failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handlePostNote(campaignId, text) {
    setBusy(`note_${campaignId}`);
    setError('');
    try {
      const hash = await writeAndWait(client, 'post_backer_note', [campaignId, text]);
      setTx({ label: 'Backer endorsement note published on-chain!', hash });
      await refresh();
    } catch (e) {
      setError('Post note failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleCancelCampaign(campaignId) {
    if (!confirm('Are you sure you want to cancel this grant? Backers will be able to claim pro-rata refunds.')) return;
    setBusy(`cancel_${campaignId}`);
    setError('');
    try {
      const hash = await writeAndWait(client, 'cancel_campaign', [campaignId]);
      setTx({ label: `Campaign #${campaignId} cancelled. Unspent funds available for refund.`, hash });
      await refresh();
    } catch (e) {
      setError('Cancel failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleClaimPayout() {
    setBusy('claim_payout');
    setError('');
    try {
      const hash = await writeAndWait(client, 'claim_payout', []);
      setTx({ label: 'Payout credits successfully withdrawn to your wallet!', hash });
      await refresh();
    } catch (e) {
      setError('Claim payout failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleClaimRefund(campaignId) {
    setBusy(`refund_${campaignId}`);
    setError('');
    try {
      const hash = await writeAndWait(client, 'claim_pro_rata_refund', [campaignId]);
      setTx({ label: `Pro-rata refund for #${campaignId} withdrawn to your wallet!`, hash });
      await refresh();
    } catch (e) {
      setError('Claim refund failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

  // Filtered Campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedCategory !== 'All Categories' && c.category !== selectedCategory) {
      return false;
    }
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
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
        <div className="brand">
          <span className="logo">🎯</span>
          <div>
            <h1>ImpactVault</h1>
            <p className="sub">
              Milestone-gated Web3 grant & crowdfunding protocol on GenLayer. Capital is locked in sequential
              tranches and trustlessly released only when AI-validators verify that off-chain deliverables satisfy immutable criteria.
            </p>
          </div>
        </div>
        <p className="addr">
          Contract:{' '}
          <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
            {truncateHash(CONTRACT_ADDRESS, 10, 8)}
          </a>{' '}
          · StudioNet (Gasless AI Consensus)
        </p>

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

      <section className="card">
        <h2>Wallet Connection & Faucet</h2>
        <WalletCard
          me={me}
          onUnlock={(pk, address) => {
            setClient(makeClient(pk));
            setMe(address);
          }}
          onLock={() => {
            setClient(makeClient(null));
            setMe(null);
          }}
        />
      </section>

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
