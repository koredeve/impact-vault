import React, { useState, useEffect } from 'react';
import {
  makeClient,
  listCampaignIds,
  readCampaign,
  readMilestonesCount,
  readMilestone,
  readCredits,
  writeAndWait,
  CONTRACT_ADDRESS,
  EXPLORER_URL,
} from './genlayer.js';
import { WalletCard } from './components/WalletCard.jsx';
import { CampaignCard } from './components/CampaignCard.jsx';
import { CreateCampaignModal } from './components/CreateCampaignModal.jsx';
import { SubmitDeliverableModal } from './components/SubmitDeliverableModal.jsx';
import { truncateHash, formatAtto, explorerTxUrl } from './lib.js';

export function App() {
  const [client, setClient] = useState(() => makeClient(null));
  const [me, setMe] = useState(null);
  const [credits, setCredits] = useState(0n);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tx, setTx] = useState(null);
  const [activeTab, setActiveTab] = useState('explore');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deliverableModalData, setDeliverableModalData] = useState(null);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
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
          items.push({ id, ...c, milestones });
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
      setError('Failed to refresh campaigns: ' + (e?.message ?? String(e)));
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
        data.desc,
        data.targetAtto,
        data.titles,
        data.criteria,
        data.bpsArray,
      ]);
      setTx({ label: `Grant campaign "${data.title}" successfully created!`, hash });
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
      setTx({ label: `Successfully contributed to campaign #${campaignId}!`, hash });
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
      label: `AI Validators are evaluating Milestone #${milestoneIdx + 1} against acceptance criteria…`,
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

  async function handleCancelCampaign(campaignId) {
    if (!confirm('Are you sure you want to cancel this campaign? Backers will be able to claim pro-rata refunds.')) return;
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
      setTx({ label: 'Payout credits successfully claimed to your wallet!', hash });
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
      setTx({ label: `Pro-rata refund for #${campaignId} claimed to your wallet!`, hash });
      await refresh();
    } catch (e) {
      setError('Claim refund failed: ' + (e?.message ?? String(e)));
    } finally {
      setBusy('');
    }
  }

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
              Milestone-gated Web3 grant & crowdfunding protocol on GenLayer. Capital is locked in tranches
              and trustlessly released only when AI-validators verify that off-chain deliverables meet immutable criteria.
            </p>
          </div>
        </div>
        <p className="addr">
          Contract:{' '}
          <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
            {truncateHash(CONTRACT_ADDRESS, 10, 8)}
          </a>{' '}
          · StudioNet (Gasless Consensus)
        </p>
      </header>

      <section className="card">
        <h2>Wallet Connection</h2>
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
            <strong>💰 Unclaimed Payout Credits Available:</strong> {formatAtto(credits)} GEN
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ margin: 0, border: 'none', padding: 0 }}>
          <button className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
            🌐 Explore Grant Vaults ({campaigns.length})
          </button>
          {me && (
            <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
              💼 My Campaigns ({myCampaigns.length})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ghost" style={{ fontSize: 13 }} onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button onClick={() => setCreateModalOpen(true)} disabled={!me}>
            + Launch Campaign
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ marginTop: 16 }} />
      ) : activeTab === 'explore' ? (
        campaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p className="hint">No grant vaults registered yet on this deployment.</p>
            <button onClick={() => setCreateModalOpen(true)} disabled={!me} style={{ marginTop: 8 }}>
              🚀 Launch First Campaign
            </button>
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((camp) => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                me={me}
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
            <p className="hint">You have not created or been assigned as beneficiary for any campaigns.</p>
          </div>
        ) : (
          <div className="campaign-grid">
            {myCampaigns.map((camp) => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                me={me}
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

      <CreateCampaignModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateCampaign}
        busy={busy === 'create'}
      />

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
        <p>Built on GenLayer StudioNet · Non-Deterministic AI Validator Consensus</p>
      </footer>
    </div>
  );
}
