import React, { useState } from 'react';
import {
  formatAtto,
  truncateHash,
  parseEthToAtto,
  formatTimeAgo,
  explorerAddressUrl,
} from '../lib.js';

export function CampaignDetailModal({
  isOpen,
  onClose,
  campaign,
  me,
  onFund,
  onSubmitDeliverable,
  onEvaluateMilestone,
  onCancel,
  onClaimRefund,
  onPostUpdate,
  onPostNote,
  busy,
}) {
  const [fundAmount, setFundAmount] = useState('1.0');
  const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap', 'consensus', 'updates', 'backers'
  const [updateText, setUpdateText] = useState('');
  const [noteText, setNoteText] = useState('');

  if (!isOpen || !campaign) return null;

  const isCreator = me && campaign.creator?.toLowerCase() === me.toLowerCase();
  const isBeneficiary = me && campaign.beneficiary?.toLowerCase() === me.toLowerCase();

  const fundedPercent = campaign.target_amount > 0n
    ? Number((BigInt(campaign.total_funded) * 100n) / BigInt(campaign.target_amount))
    : 0;

  const currentM = campaign.milestones?.[Number(campaign.current_milestone_index)];

  function statusPill(status) {
    switch (status) {
      case 'funding':
        return <span className="pill warn">Funding State</span>;
      case 'active':
        return <span className="pill cyan">Active Execution</span>;
      case 'completed':
        return <span className="pill ok">✓ Completed</span>;
      case 'cancelled':
        return <span className="pill danger">Cancelled</span>;
      default:
        return <span className="pill">{status}</span>;
    }
  }

  function milestoneStatusPill(status) {
    switch (status) {
      case 'pending':
        return <span className="pill">Pending</span>;
      case 'submitted':
        return <span className="pill cyan">⚡ Review Ready</span>;
      case 'approved':
        return <span className="pill ok">✓ Approved & Disbursed</span>;
      case 'rejected':
        return <span className="pill danger">✕ Rejected</span>;
      default:
        return <span className="pill">{status}</span>;
    }
  }

  function handlePostUpdate(e) {
    e.preventDefault();
    if (!updateText.trim()) return;
    onPostUpdate(campaign.id, updateText.trim());
    setUpdateText('');
  }

  function handlePostNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    onPostNote(campaign.id, noteText.trim());
    setNoteText('');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span className="pill" style={{ color: 'var(--accent-hover)' }}>{campaign.category || 'General'}</span>
              <span className="tag">{campaign.id}</span>
              {statusPill(campaign.status)}
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22 }}>{campaign.title}</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose} style={{ padding: '4px 10px' }}>
            ✕
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          {campaign.description}
        </p>

        {/* Financial Overview Card */}
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target Goal</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{formatAtto(campaign.target_amount)} GEN</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Funded</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{formatAtto(campaign.total_funded)} GEN ({fundedPercent}%)</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Disbursed Tranches</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ok)' }}>{formatAtto(campaign.total_released)} GEN</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unspent Vault Balance</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{formatAtto(BigInt(campaign.total_funded) - BigInt(campaign.total_released))} GEN</div>
            </div>
          </div>

          <div className="progress-bar-wrap" style={{ margin: '8px 0' }}>
            <div className="progress-bar-fill" style={{ width: `${Math.min(fundedPercent, 100)}%` }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', gap: 8 }}>
            <span>
              Creator: <a href={explorerAddressUrl(campaign.creator)} target="_blank" rel="noreferrer" className="mono">{truncateHash(campaign.creator, 6, 4)}</a>
            </span>
            <span>
              Beneficiary: <a href={explorerAddressUrl(campaign.beneficiary)} target="_blank" rel="noreferrer" className="mono">{truncateHash(campaign.beneficiary, 6, 4)}</a>
            </span>
            <span>
              Milestone Progress: <strong>{Number(campaign.current_milestone_index)} / {Number(campaign.total_milestones)}</strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--border-active)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-hover)', textTransform: 'uppercase' }}>
                Vault Governance Actions
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {campaign.status === 'funding' && 'Campaign is collecting backer contributions to reach the funding target.'}
                {campaign.status === 'active' && 'Active development phase. Milestone tranches unlocked upon AI validator consensus.'}
                {campaign.status === 'completed' && 'All milestone deliverables completed and 100% of vault funds disbursed.'}
                {campaign.status === 'cancelled' && 'Campaign cancelled. Backers can claim pro-rata refunds of remaining unspent funds.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {campaign.status === 'funding' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    style={{ width: 90, padding: '6px 10px', fontSize: 13 }}
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                  />
                  <button
                    style={{ padding: '6px 14px', fontSize: 13 }}
                    onClick={() => onFund(campaign.id, parseEthToAtto(fundAmount))}
                    disabled={Boolean(busy) || !me}
                  >
                    {busy === `fund_${campaign.id}` ? 'Funding…' : '💳 Back Grant'}
                  </button>
                </div>
              )}

              {campaign.status === 'active' && currentM && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(isBeneficiary || isCreator) && (currentM.status === 'pending' || currentM.status === 'rejected') && (
                    <button
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      onClick={() => onSubmitDeliverable(campaign, Number(campaign.current_milestone_index), currentM)}
                      disabled={Boolean(busy)}
                    >
                      📤 Submit Milestone Proof
                    </button>
                  )}

                  {currentM.status === 'submitted' && (
                    <button
                      className="success"
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      onClick={() => onEvaluateMilestone(campaign.id, Number(campaign.current_milestone_index))}
                      disabled={Boolean(busy)}
                    >
                      {busy === `eval_${campaign.id}` ? 'Evaluating in AI Consensus…' : '⚡ Run AI Consensus'}
                    </button>
                  )}
                </div>
              )}

              {campaign.status === 'cancelled' && (
                <button
                  className="ghost"
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  onClick={() => onClaimRefund(campaign.id)}
                  disabled={Boolean(busy) || !me}
                >
                  Claim Pro-Rata Refund
                </button>
              )}

              {isCreator && (campaign.status === 'funding' || campaign.status === 'active') && (
                <button
                  type="button"
                  className="ghost"
                  style={{ padding: '6px 10px', fontSize: 12, color: 'var(--danger)' }}
                  onClick={() => onCancel(campaign.id)}
                  disabled={Boolean(busy)}
                >
                  Cancel Campaign
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab-btn ${activeTab === 'roadmap' ? 'active' : ''}`} onClick={() => setActiveTab('roadmap')}>
            🗺️ Milestone Roadmap ({campaign.milestones?.length || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>
            📢 On-Chain Updates ({campaign.updates?.length || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'backers' ? 'active' : ''}`} onClick={() => setActiveTab('backers')}>
            👥 Backer Ledger ({campaign.backers?.length || 0})
          </button>
        </div>

        {/* Tab 1: Milestone Roadmap */}
        {activeTab === 'roadmap' && (
          <div>
            {campaign.milestones?.map((m, idx) => {
              const isCurrent = Number(campaign.current_milestone_index) === idx && campaign.status === 'active';
              return (
                <div
                  key={idx}
                  style={{
                    background: isCurrent ? 'rgba(99, 102, 241, 0.06)' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${isCurrent ? 'var(--border-active)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      #{idx + 1} {m.title} <span className="pill cyan" style={{ marginLeft: 6 }}>{(Number(m.bps) / 100).toFixed(0)}% Allocation</span>
                    </div>
                    {milestoneStatusPill(m.status)}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                    <strong>Objective Criteria:</strong> {m.criteria}
                  </div>

                  {m.deliverable_desc && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-hover)', marginBottom: 4 }}>
                        Submitted Deliverable Summary:
                      </div>
                      <div style={{ fontSize: 13 }}>{m.deliverable_desc}</div>

                      {m.evidence_urls && m.evidence_urls.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {m.evidence_urls.map((url, uidx) => (
                            <a
                              key={uidx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="pill"
                              style={{ color: 'var(--cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                            >
                              🔗 {url.replace(/^https?:\/\//, '').slice(0, 30)}…
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {m.evaluation_notes && (
                    <div style={{ background: m.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${m.status === 'approved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, padding: 10, borderRadius: 8, marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.status === 'approved' ? 'var(--ok)' : 'var(--danger)', marginBottom: 2 }}>
                        🤖 GenLayer AI Consensus Verdict:
                      </div>
                      <div style={{ fontSize: 13, fontStyle: 'italic' }}>
                        "{m.evaluation_notes}"
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: On-Chain Updates */}
        {activeTab === 'updates' && (
          <div>
            {(isCreator || isBeneficiary) && (
              <form onSubmit={handlePostUpdate} style={{ marginBottom: 16, background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Post Creator Development Log</label>
                <textarea
                  rows={2}
                  placeholder="Share latest engineering progress, sprint updates, or testnet stats..."
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" disabled={Boolean(busy) || !updateText.trim()}>
                    {busy === `update_${campaign.id}` ? 'Posting…' : 'Post Creator Log'}
                  </button>
                </div>
              </form>
            )}

            {me && !isCreator && !isBeneficiary && (
              <form onSubmit={handlePostNote} style={{ marginBottom: 16, background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Post Backer Feedback / Note</label>
                <textarea
                  rows={2}
                  placeholder="Leave endorsement feedback or community review for the project team..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" disabled={Boolean(busy) || !noteText.trim()}>
                    {busy === `note_${campaign.id}` ? 'Posting…' : 'Post Backer Note'}
                  </button>
                </div>
              </form>
            )}

            {campaign.updates?.length === 0 ? (
              <p className="hint" style={{ textAlign: 'center', padding: '20px 0' }}>No updates posted on-chain yet.</p>
            ) : (
              <div>
                {campaign.updates?.map((up, uidx) => (
                  <div key={uidx} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span className={up.update_type === 'CREATOR_LOG' ? 'pill cyan' : 'pill'}>
                        {up.update_type === 'CREATOR_LOG' ? '🛠️ Creator Update' : '💬 Backer Note'}
                      </span>
                      <span>
                        <span className="mono">{truncateHash(up.author, 6, 4)}</span> · {formatTimeAgo(up.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{up.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Backer Ledger */}
        {activeTab === 'backers' && (
          <div>
            {campaign.backers?.length === 0 ? (
              <p className="hint" style={{ textAlign: 'center', padding: '20px 0' }}>No backer contributions recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Backer Address</th>
                      <th>Contribution (GEN)</th>
                      <th>Pool Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.backers?.map((b, bidx) => {
                      const share = campaign.total_funded > 0n
                        ? (Number(BigInt(b.contribution) * 10000n / BigInt(campaign.total_funded)) / 100).toFixed(2)
                        : '0.00';
                      return (
                        <tr key={bidx}>
                          <td className="mono">
                            <a href={explorerAddressUrl(b.address)} target="_blank" rel="noreferrer">
                              {truncateHash(b.address, 10, 8)}
                            </a>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--cyan)' }}>{formatAtto(b.contribution)} GEN</td>
                          <td>{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
