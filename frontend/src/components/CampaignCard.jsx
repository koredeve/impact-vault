import React, { useState } from 'react';
import { formatAtto, truncateHash, parseEthToAtto } from '../lib.js';

export function CampaignCard({
  campaign,
  me,
  onFund,
  onSubmitDeliverable,
  onEvaluateMilestone,
  onCancel,
  onClaimRefund,
  busy,
}) {
  const [fundAmount, setFundAmount] = useState('1.0');
  const [expanded, setExpanded] = useState(false);

  const isCreator = me && campaign.creator?.toLowerCase() === me.toLowerCase();
  const isBeneficiary = me && campaign.beneficiary?.toLowerCase() === me.toLowerCase();

  const fundedPercent = campaign.target_amount > 0n
    ? Number((BigInt(campaign.total_funded) * 100n) / BigInt(campaign.target_amount))
    : 0;

  const currentM = campaign.milestones?.[Number(campaign.current_milestone_index)];

  function statusPill(status) {
    switch (status) {
      case 'funding':
        return <span className="pill warn">Funding</span>;
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
        return <span className="pill ok">✓ Approved</span>;
      case 'rejected':
        return <span className="pill danger">✕ Rejected</span>;
      default:
        return <span className="pill">{status}</span>;
    }
  }

  return (
    <div className="campaign-card">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div>
            <span className="tag" style={{ marginRight: 6 }}>{campaign.id}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{campaign.title}</span>
          </div>
          {statusPill(campaign.status)}
        </div>

        <p className="hint" style={{ marginBottom: 12, fontSize: 13, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {campaign.description}
        </p>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Funding Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {formatAtto(campaign.total_funded)} / {formatAtto(campaign.target_amount)} GEN ({fundedPercent}%)
            </span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${Math.min(fundedPercent, 100)}%` }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span>Beneficiary: <strong className="mono">{truncateHash(campaign.beneficiary, 6, 4)}</strong></span>
          <span>Milestones: <strong>{Number(campaign.current_milestone_index)} / {Number(campaign.total_milestones)}</strong></span>
        </div>

        {campaign.status === 'active' && currentM && (
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: 10, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-hover)' }}>
                Active: {currentM.title} ({(Number(currentM.bps) / 100).toFixed(0)}%)
              </span>
              {milestoneStatusPill(currentM.status)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {currentM.criteria}
            </div>
          </div>
        )}

        {expanded && campaign.milestones && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Milestone Roadmap:</h4>
            {campaign.milestones.map((m, idx) => (
              <div key={idx} style={{ padding: '6px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>#{idx + 1} {m.title} ({(Number(m.bps) / 100).toFixed(0)}%)</strong>
                  {milestoneStatusPill(m.status)}
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{m.criteria}</div>
                {m.evaluation_notes && (
                  <div style={{ color: 'var(--ok)', marginTop: 4, fontStyle: 'italic' }}>
                    AI Consensus: "{m.evaluation_notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <button
            type="button"
            className="ghost"
            style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▲ Hide Milestones' : '▼ View All Milestones'}
          </button>

          {isCreator && (campaign.status === 'funding' || campaign.status === 'active') && (
            <button
              type="button"
              className="ghost"
              style={{ fontSize: 11, padding: '4px 8px', color: 'var(--danger)' }}
              onClick={() => onCancel(campaign.id)}
              disabled={Boolean(busy)}
            >
              Cancel Campaign
            </button>
          )}
        </div>

        {campaign.status === 'funding' && (
          <div className="row">
            <input
              type="number"
              step="0.1"
              min="0.1"
              style={{ minWidth: 90, padding: '6px 10px', fontSize: 13 }}
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
            />
            <button
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => onFund(campaign.id, parseEthToAtto(fundAmount))}
              disabled={Boolean(busy) || !me}
            >
              {busy === `fund_${campaign.id}` ? 'Funding…' : '💳 Back Project'}
            </button>
          </div>
        )}

        {campaign.status === 'active' && currentM && (
          <div className="row">
            {(isBeneficiary || isCreator) && (currentM.status === 'pending' || currentM.status === 'rejected') && (
              <button
                style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
                onClick={() => onSubmitDeliverable(campaign, Number(campaign.current_milestone_index), currentM)}
                disabled={Boolean(busy)}
              >
                📤 Submit Deliverable
              </button>
            )}

            {currentM.status === 'submitted' && (
              <button
                className="success"
                style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
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
            style={{ width: '100%', padding: '8px 12px', fontSize: 12 }}
            onClick={() => onClaimRefund(campaign.id)}
            disabled={Boolean(busy) || !me}
          >
            Claim Pro-Rata Refund
          </button>
        )}
      </div>
    </div>
  );
}
