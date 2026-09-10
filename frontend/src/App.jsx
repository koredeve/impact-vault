import React, { useState, useEffect } from 'react';
import {
  makeClient,
  makeExtensionClient,
  readPlatformMetrics,
  readAllCampaignsFull,
  readCampaignFull,
  readCredits,
  writeAndWait,
  CONTRACT_ADDRESS,
  EXPLORER_URL,
} from './genlayer.js';
import { WalletHeader } from './components/WalletHeader.jsx';
import { CampaignDetailModal } from './components/CampaignDetailModal.jsx';
import { CriteriaAssistantModal } from './components/CriteriaAssistantModal.jsx';
import { SubmitDeliverableModal } from './components/SubmitDeliverableModal.jsx';
import { ConnectWalletModal } from './components/ConnectWalletModal.jsx';
import { ExploreView } from './components/views/ExploreView.jsx';
import { LaunchVaultView } from './components/views/LaunchVaultView.jsx';
import { ProtocolExplorerView } from './components/views/ProtocolExplorerView.jsx';
import { PortfolioView } from './components/views/PortfolioView.jsx';
import { truncateHash, formatAtto, explorerTxUrl, SEEDED_CAMPAIGNS_FALLBACK } from './lib.js';

export function App() {
  const [client, setClient] = useState(() => makeClient(null));
  const [me, setMe] = useState(null);
  const [credits, setCredits] = useState(0n);
  const [metrics, setMetrics] = useState(null);
  const [campaigns, setCampaigns] = useState(() => SEEDED_CAMPAIGNS_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tx, setTx] = useState(null);

  // Multi-View Navigation Route: 'explore' | 'create' | 'explorer' | 'portfolio'
  const [currentRoute, setCurrentRoute] = useState(() => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (['explore', 'create', 'explorer', 'portfolio'].includes(hash)) return hash;
    return 'explore';
  });

  // Modals
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [presetMilestones, setPresetMilestones] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [deliverableModalData, setDeliverableModalData] = useState(null);

  // Sync route with URL hash
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['explore', 'create', 'explorer', 'portfolio'].includes(hash)) {
        setCurrentRoute(hash);
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function navigateTo(route) {
    setCurrentRoute(route);
    window.location.hash = `#/${route}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

  async function refresh() {
    await Promise.all([fetchMetrics(), fetchCampaigns()]);
    if (me) await fetchCredits(me);
  }

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
    try {
      const list = await readAllCampaignsFull(client);
      if (Array.isArray(list) && list.length > 0) {
        setCampaigns(list);
        if (selectedCampaign) {
          const updated = list.find((c) => c.id === selectedCampaign.id);
          if (updated) setSelectedCampaign(updated);
        }
      }
    } catch (err) {
      console.warn('Live campaigns sync note:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign(formData) {
    if (!me) {
      setConnectModalOpen(true);
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
          formData.cid,
          formData.beneficiary,
          formData.title,
          formData.category,
          formData.desc,
          formData.targetAtto,
          formData.titles,
          formData.criteria,
          formData.bpsArray,
        ],
        0n
      );
      setTx({ hash, label: `Created grant vault "${formData.title}"` });
      setPresetMilestones(null);
      await fetchCampaigns();
      await fetchMetrics();
      navigateTo('explore');
    } catch (err) {
      setError(err?.message || 'Failed to create campaign');
    } finally {
      setBusy('');
    }
  }

  async function handleFundCampaign(campaignId, attoAmount) {
    if (!me) {
      setConnectModalOpen(true);
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

  async function handleSubmitDeliverable(data) {
    if (!me) {
      setConnectModalOpen(true);
      return;
    }
    const { campaignId, milestoneIdx, desc, evidenceUrls } = data;
    setBusy(`submit_${campaignId}_${milestoneIdx}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(
        client,
        'submit_deliverable',
        [campaignId, BigInt(milestoneIdx), desc, evidenceUrls],
        0n
      );
      setTx({ hash, label: `Submitted proof for Milestone #${Number(milestoneIdx) + 1}` });
      setDeliverableModalData(null);
      await fetchCampaigns();
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaignFull(client, campaignId);
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (err) {
      setError(err?.message || 'Submission failed');
    } finally {
      setBusy('');
    }
  }

  async function handleEvaluateMilestone(campaignId, milestoneIdx) {
    if (!me) {
      setConnectModalOpen(true);
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
      setTx({ hash, label: `Evaluated Milestone #${milestoneIdx + 1} with AI Consensus` });
      await fetchCampaigns();
      await fetchMetrics();
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaignFull(client, campaignId);
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (err) {
      setError(err?.message || 'AI Evaluation failed');
    } finally {
      setBusy('');
    }
  }

  async function handlePostUpdate(campaignId, text) {
    if (!me) {
      setConnectModalOpen(true);
      return;
    }
    setBusy(`update_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'post_campaign_update', [campaignId, text], 0n);
      setTx({ hash, label: 'Posted creator progress update' });
      await fetchCampaigns();
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaignFull(client, campaignId);
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (err) {
      setError(err?.message || 'Failed to post update');
    } finally {
      setBusy('');
    }
  }

  async function handlePostBackerNote(campaignId, text) {
    if (!me) {
      setConnectModalOpen(true);
      return;
    }
    setBusy(`note_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'post_backer_note', [campaignId, text], 0n);
      setTx({ hash, label: 'Posted backer community note' });
      await fetchCampaigns();
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaignFull(client, campaignId);
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (err) {
      setError(err?.message || 'Failed to post note');
    } finally {
      setBusy('');
    }
  }

  async function handleCancelCampaign(campaignId) {
    if (!confirm('Are you sure you want to cancel this campaign? Unspent vault balance will become refundable.')) return;
    setBusy(`cancel_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'cancel_campaign', [campaignId], 0n);
      setTx({ hash, label: 'Cancelled grant campaign' });
      await fetchCampaigns();
      await fetchMetrics();
      if (selectedCampaign?.id === campaignId) {
        const fresh = await readCampaignFull(client, campaignId);
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (err) {
      setError(err?.message || 'Cancellation failed');
    } finally {
      setBusy('');
    }
  }

  async function handleClaimRefund(campaignId) {
    setBusy(`refund_${campaignId}`);
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'claim_pro_rata_refund', [campaignId], 0n);
      setTx({ hash, label: 'Claimed pro-rata refund to credit balance' });
      await fetchCampaigns();
      if (me) await fetchCredits(me);
    } catch (err) {
      setError(err?.message || 'Refund claim failed');
    } finally {
      setBusy('');
    }
  }

  async function handleClaimPayout() {
    setBusy('claim_payout');
    setError('');
    setTx(null);
    try {
      const hash = await writeAndWait(client, 'claim_payout', [], 0n);
      setTx({ hash, label: 'Withdrew all unlocked milestone credits to wallet' });
      if (me) await fetchCredits(me);
    } catch (err) {
      setError(err?.message || 'Payout claim failed');
    } finally {
      setBusy('');
    }
  }

  const dynamicTvl = campaigns.reduce((sum, c) => sum + BigInt(c.total_funded || 0n), 0n);
  const dynamicReleased = campaigns.reduce((sum, c) => sum + BigInt(c.total_released || 0n), 0n);
  const dynamicActive = campaigns.filter((c) => c.status === 'active' || c.status === 'funding').length;
  const dynamicCompleted = campaigns.filter((c) => c.status === 'completed').length;

  const displayTvl = metrics?.tvl_atto && BigInt(metrics.tvl_atto) > dynamicTvl ? BigInt(metrics.tvl_atto) : dynamicTvl;
  const displayReleased = metrics?.total_released_atto && BigInt(metrics.total_released_atto) > dynamicReleased ? BigInt(metrics.total_released_atto) : dynamicReleased;
  const displayActive = metrics?.active_campaigns ? (Number(metrics.active_campaigns) + Number(metrics.funding_campaigns || 0n)) : dynamicActive;
  const displayCompleted = metrics?.completed_campaigns ? Number(metrics.completed_campaigns) : dynamicCompleted;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => navigateTo('explore')}>
          <span className="logo-icon">🎯</span>
          <div>
            <h1 className="brand-title">ImpactVault</h1>
            <div className="brand-sub">
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="contract-badge" onClick={(e) => e.stopPropagation()}>
                {truncateHash(CONTRACT_ADDRESS, 6, 6)} · StudioNet
              </a>
            </div>
          </div>
        </div>

        {/* Center Nav Views */}
        <nav className="nav-links" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className={`ghost nav-link-btn ${currentRoute === 'explore' ? 'active' : ''}`}
            onClick={() => navigateTo('explore')}
          >
            🌐 Active Vaults ({campaigns.length})
          </button>
          <button
            type="button"
            className={`ghost nav-link-btn ${currentRoute === 'create' ? 'active' : ''}`}
            onClick={() => navigateTo('create')}
          >
            ➕ Launch Vault
          </button>
          <button
            type="button"
            className={`ghost nav-link-btn ${currentRoute === 'explorer' ? 'active' : ''}`}
            onClick={() => navigateTo('explorer')}
          >
            🏛️ Protocol Explorer
          </button>
          <button
            type="button"
            className={`ghost nav-link-btn ${currentRoute === 'portfolio' ? 'active' : ''}`}
            onClick={() => navigateTo('portfolio')}
          >
            💼 My Portfolio
          </button>
        </nav>

        {/* Right Wallet Header Controls */}
        <WalletHeader
          me={me}
          onConnect={(address, provider) => {
            setMe(address);
            setClient(makeExtensionClient(address, provider));
          }}
          onDisconnect={() => {
            setMe(null);
            setClient(makeClient(null));
          }}
        />
      </header>

      {/* Protocol Metrics Ribbon */}
      <section className="metrics-bar" style={{ marginTop: 20 }}>
        <div className="metric-box">
          <span className="metric-label">TOTAL VAULT TVL</span>
          <span className="metric-val">{formatAtto(displayTvl)} GEN</span>
          <span className="metric-sub">Crowdfunded capital locked</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">TOTAL DISBURSED</span>
          <span className="metric-val" style={{ color: 'var(--ok)' }}>
            {formatAtto(displayReleased)} GEN
          </span>
          <span className="metric-sub">Released via AI consensus</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">ACTIVE GRANT VAULTS</span>
          <span className="metric-val" style={{ color: 'var(--cyan)' }}>
            {displayActive}
          </span>
          <span className="metric-sub">Sequential milestone tranches</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">COMPLETED PROJECTS</span>
          <span className="metric-val" style={{ color: '#a855f7' }}>
            {displayCompleted}
          </span>
          <span className="metric-sub">100% roadmap achieved</span>
        </div>
      </section>

      {/* Transaction Notifications */}
      {tx && (
        <div className="card tx-banner" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span className="pill ok" style={{ marginRight: 8 }}>✓ Confirmed on StudioNet</span>
              <span>{tx.label}</span>
            </div>
            <a href={explorerTxUrl(tx.hash)} target="_blank" rel="noreferrer" className="mono" style={{ color: 'var(--cyan)' }}>
              Tx: {truncateHash(tx.hash, 10, 8)} ↗
            </a>
          </div>
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

      {/* Main View Router */}
      <main style={{ marginTop: 24 }}>
        {currentRoute === 'explore' && (
          <ExploreView
            campaigns={campaigns}
            loading={loading}
            me={me}
            onSelectCampaign={(c) => setSelectedCampaign(c)}
            onFund={handleFundCampaign}
            onSubmitDeliverable={(c, idx, m) => setDeliverableModalData({ campaign: c, milestoneIdx: idx, milestone: m })}
            onEvaluateMilestone={handleEvaluateMilestone}
            onCancel={handleCancelCampaign}
            onClaimRefund={handleClaimRefund}
            busy={busy}
            onOpenCreate={() => navigateTo('create')}
            onOpenAssistant={() => setAssistantModalOpen(true)}
            onRefresh={refresh}
          />
        )}

        {currentRoute === 'create' && (
          <LaunchVaultView
            onCreate={handleCreateCampaign}
            onOpenAssistant={() => setAssistantModalOpen(true)}
            presetMilestones={presetMilestones}
            busy={busy}
            me={me}
            onOpenConnect={() => setConnectModalOpen(true)}
          />
        )}

        {currentRoute === 'explorer' && (
          <ProtocolExplorerView
            campaigns={campaigns}
            onSelectCampaign={(c) => setSelectedCampaign(c)}
            onRefresh={refresh}
            loading={loading}
          />
        )}

        {currentRoute === 'portfolio' && (
          <PortfolioView
            me={me}
            credits={credits}
            campaigns={campaigns}
            onSelectCampaign={(c) => setSelectedCampaign(c)}
            onFund={handleFundCampaign}
            onSubmitDeliverable={(c, idx, m) => setDeliverableModalData({ campaign: c, milestoneIdx: idx, milestone: m })}
            onEvaluateMilestone={handleEvaluateMilestone}
            onCancel={handleCancelCampaign}
            onClaimPayout={handleClaimPayout}
            onClaimRefund={handleClaimRefund}
            onOpenCreate={() => navigateTo('create')}
            onOpenConnect={() => setConnectModalOpen(true)}
            busy={busy}
          />
        )}
      </main>

      {/* Campaign Detail Modal */}
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
        onPostNote={handlePostBackerNote}
        busy={busy}
      />

      {/* Criteria AI Assistant Modal */}
      <CriteriaAssistantModal
        isOpen={assistantModalOpen}
        onClose={() => setAssistantModalOpen(false)}
        onApplyCriteria={(milestones) => {
          setPresetMilestones(milestones);
          navigateTo('create');
        }}
      />

      {/* Milestone Deliverable Submission Modal */}
      <SubmitDeliverableModal
        isOpen={Boolean(deliverableModalData)}
        onClose={() => setDeliverableModalData(null)}
        campaign={deliverableModalData?.campaign}
        milestoneIdx={deliverableModalData?.milestoneIdx}
        milestone={deliverableModalData?.milestone}
        onSubmit={handleSubmitDeliverable}
        busy={busy.startsWith('submit_')}
      />

      {/* Fallback Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onConnectSuccess={(address, provider) => {
          setMe(address);
          setClient(makeExtensionClient(address, provider));
        }}
      />

      <footer style={{ marginTop: 60, padding: '24px 0', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
        <p>ImpactVault · Milestone-Gated DAO Grants on GenLayer StudioNet · Non-Deterministic AI Validator Consensus</p>
      </footer>
    </div>
  );
}
