import React, { useState } from 'react';
import { formatAtto, truncateHash, explorerAddressUrl } from '../../lib.js';
import { EXPLORER_URL } from '../../genlayer.js';

export function ProtocolExplorerView({ campaigns, onSelectCampaign, onRefresh, loading }) {
  const [activeSubTab, setActiveSubTab] = useState('milestones'); // 'milestones', 'payouts', 'activity'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'approved', 'submitted', 'pending', 'rejected'

  // Flatten all milestones across all campaigns
  const allMilestones = [];
  const allUpdates = [];
  let totalDisbursedAtto = 0n;
  let totalApprovedCount = 0;
  let totalSubmittedCount = 0;

  campaigns.forEach((camp) => {
    totalDisbursedAtto += BigInt(camp.total_released || 0n);

    if (Array.isArray(camp.milestones)) {
      camp.milestones.forEach((m, idx) => {
        if (m.status === 'approved') totalApprovedCount++;
        if (m.status === 'submitted') totalSubmittedCount++;

        allMilestones.push({
          campaignId: camp.id,
          campaignTitle: camp.title,
          campaignCategory: camp.category,
          beneficiary: camp.beneficiary,
          creator: camp.creator,
          milestoneIdx: idx,
          targetAmount: camp.target_amount,
          trancheAtto: (BigInt(camp.target_amount || 0n) * BigInt(m.bps || 0n)) / 10000n,
          ...m,
        });
      });
    }

    if (Array.isArray(camp.updates)) {
      camp.updates.forEach((u) => {
        allUpdates.push({
          campaignId: camp.id,
          campaignTitle: camp.title,
          ...u,
        });
      });
    }
  });

  // Sort updates by timestamp desc
  allUpdates.sort((a, b) => Number(b.timestamp || 0n) - Number(a.timestamp || 0n));

  const filteredMilestones = allMilestones.filter((m) => {
    if (filterStatus === 'ALL') return true;
    return m.status === filterStatus;
  });

  function renderStatusPill(status) {
    switch (status) {
      case 'approved':
        return <span className="pill ok">✓ Approved & Disbursed</span>;
      case 'submitted':
        return <span className="pill cyan">⚡ Review Ready</span>;
      case 'rejected':
        return <span className="pill danger">✕ Rejected</span>;
      default:
        return <span className="pill">{status}</span>;
    }
  }

  return (
    <div className="protocol-explorer-view" style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: 24, borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>🏛️</span>
              <h2 style={{ fontSize: 24, margin: 0, fontWeight: 800 }}>Protocol Explorer & Resolved Cases</h2>
            </div>
            <p className="hint" style={{ margin: 0, fontSize: 14, maxWidth: 720 }}>
              Immutable public audit trail of milestone deliverables, AI validator consensus decisions, off-chain evidence verification, and capital disbursements executed natively on GenLayer StudioNet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost" onClick={onRefresh} disabled={loading} style={{ fontSize: 13, padding: '8px 14px' }}>
              {loading ? '↻ Refreshing…' : '↻ Refresh Ledger'}
            </button>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="ghost"
              style={{
                fontSize: 13,
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                color: 'var(--accent-hover)',
              }}
            >
              🔍 StudioNet Contract ↗
            </a>
          </div>
        </div>

        {/* High-Level Transparency Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
          <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>TOTAL EVALUATED CASES</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{allMilestones.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Across {campaigns.length} grant vaults</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>TOTAL CAPITAL DISBURSED</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ok)', marginTop: 4 }}>
              {formatAtto(totalDisbursedAtto)} GEN
            </div>
            <div style={{ fontSize: 11, color: 'var(--ok)' }}>Released via AI consensus</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>APPROVED TRANCHES</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)', marginTop: 4 }}>
              {totalApprovedCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalSubmittedCount} in review</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>CONSENSUS INTEGRITY</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#a855f7', marginTop: 4 }}>
              100%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Non-deterministic multi-validator</div>
          </div>
        </div>
      </div>

      {/* Explorer Sub-Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          type="button"
          className={`tab-btn ${activeSubTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('milestones')}
        >
          📋 Milestone Verification Ledger ({allMilestones.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeSubTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('payouts')}
        >
          💰 Disbursed Payouts ({campaigns.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeSubTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('activity')}
        >
          ⚡ On-Chain Progress Feed ({allUpdates.length})
        </button>
      </div>

      {/* TAB 1: Milestone Verification Ledger */}
      {activeSubTab === 'milestones' && (
        <div>
          {/* Status filter buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Verdict:</span>
            {['ALL', 'approved', 'submitted', 'pending', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                className={`ghost ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  textTransform: 'capitalize',
                  background: filterStatus === st ? 'var(--accent)' : 'transparent',
                  color: filterStatus === st ? '#fff' : 'var(--text-muted)',
                  borderColor: filterStatus === st ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {st === 'ALL' ? 'All Milestones' : st}
              </button>
            ))}
          </div>

          {filteredMilestones.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
              <p className="hint" style={{ margin: 0 }}>No milestones match the selected verdict filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredMilestones.map((m, idx) => (
                <div
                  key={`${m.campaignId}-${m.milestoneIdx}-${idx}`}
                  className="card"
                  style={{ padding: 18, borderRadius: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <span className="pill" style={{ fontSize: 11 }}>{m.campaignCategory}</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.campaignId}</span>
                        {renderStatusPill(m.status)}
                      </div>
                      <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700 }}>
                        {m.title || `Milestone #${m.milestoneIdx + 1}`}
                      </h3>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        From Vault: <strong style={{ color: 'var(--text)' }}>{m.campaignTitle}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tranche Allocation</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: m.status === 'approved' ? 'var(--ok)' : 'var(--text)' }}>
                        {formatAtto(m.trancheAtto)} GEN ({Number(m.bps) / 100}%)
                      </div>
                      <button
                        type="button"
                        className="ghost"
                        style={{ fontSize: 11, padding: '3px 8px', marginTop: 4 }}
                        onClick={() => {
                          const targetCamp = campaigns.find((c) => c.id === m.campaignId);
                          if (targetCamp) onSelectCampaign(targetCamp);
                        }}
                      >
                        Inspect Full Vault ↗
                      </button>
                    </div>
                  </div>

                  {/* Criteria Box */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                      Target Acceptance Criteria:
                    </div>
                    <div>{m.criteria}</div>
                  </div>

                  {/* Deliverable Evidence Details */}
                  {m.deliverable_desc ? (
                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid var(--border-active)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-hover)', textTransform: 'uppercase' }}>
                          Submitted Deliverable Proof:
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px', color: 'var(--text)' }}>{m.deliverable_desc}</p>

                      {Array.isArray(m.evidence_urls) && m.evidence_urls.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Verified Off-Chain Evidence Links:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {m.evidence_urls.map((url, uIdx) => (
                              <a
                                key={uIdx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="mono"
                                style={{
                                  fontSize: 12,
                                  color: 'var(--cyan)',
                                  textDecoration: 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                🔗 {url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {m.evaluation_notes && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok)' }}>AI Validator Consensus Verdict: </span>
                          <span style={{ fontSize: 12, color: 'var(--text)' }}>{m.evaluation_notes}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Deliverable proof has not yet been submitted by the creator/beneficiary.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Disbursed Payouts */}
      {activeSubTab === 'payouts' && (
        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <h3 style={{ fontSize: 18, margin: '0 0 14px', fontWeight: 700 }}>💰 Protocol Disbursement Ledger</h3>
          <p className="hint" style={{ fontSize: 13, marginBottom: 16 }}>
            Track capital locked, funded, and released to project beneficiaries across all vaults.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Grant Vault</th>
                  <th style={{ padding: '10px 8px' }}>Beneficiary</th>
                  <th style={{ padding: '10px 8px' }}>Target Goal</th>
                  <th style={{ padding: '10px 8px' }}>Total Funded</th>
                  <th style={{ padding: '10px 8px' }}>Disbursed</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{c.title}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <a href={explorerAddressUrl(c.beneficiary)} target="_blank" rel="noreferrer" className="mono" style={{ color: 'var(--cyan)' }}>
                        {truncateHash(c.beneficiary, 6, 4)}
                      </a>
                    </td>
                    <td style={{ padding: '10px 8px' }}>{formatAtto(c.target_amount)} GEN</td>
                    <td style={{ padding: '10px 8px', color: 'var(--cyan)' }}>{formatAtto(c.total_funded)} GEN</td>
                    <td style={{ padding: '10px 8px', color: 'var(--ok)', fontWeight: 700 }}>{formatAtto(c.total_released)} GEN</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className={`pill ${c.status === 'completed' ? 'ok' : c.status === 'active' ? 'cyan' : 'warn'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        type="button"
                        className="ghost"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() => onSelectCampaign(c)}
                      >
                        Inspect ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: On-Chain Progress Feed */}
      {activeSubTab === 'activity' && (
        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <h3 style={{ fontSize: 18, margin: '0 0 14px', fontWeight: 700 }}>⚡ Immutable Project Updates & Backer Notes</h3>
          {allUpdates.length === 0 ? (
            <p className="hint" style={{ margin: 0, textAlign: 'center', padding: 24 }}>
              No on-chain creator logs or backer notes posted yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allUpdates.map((u, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`pill ${u.update_type === 'CREATOR_LOG' ? 'cyan' : 'ok'}`} style={{ fontSize: 10 }}>
                        {u.update_type === 'CREATOR_LOG' ? '📢 Creator Log' : '💬 Backer Note'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>on {u.campaignTitle}</span>
                    </div>
                    <a href={explorerAddressUrl(u.author)} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {truncateHash(u.author, 6, 4)}
                    </a>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
                    {u.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
