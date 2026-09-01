import React, { useState } from 'react';
import { parseEthToAtto } from '../lib.js';

export function CreateCampaignModal({ isOpen, onClose, onCreate, busy }) {
  const [cid, setCid] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [targetEth, setTargetEth] = useState('5.0');
  
  const [milestones, setMilestones] = useState([
    { title: 'Milestone 1: Prototype & Spec', criteria: 'Working prototype with unit test coverage > 80%', bps: 3000 },
    { title: 'Milestone 2: StudioNet Testnet Protocol', criteria: 'Deploy protocol on StudioNet with interactive frontend demo', bps: 3500 },
    { title: 'Milestone 3: Mainnet Launch & Security Audit', criteria: 'Audit report completed with all findings resolved', bps: 3500 },
  ]);

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const totalBps = milestones.reduce((sum, m) => sum + (parseInt(m.bps) || 0), 0);

  function addMilestone() {
    setMilestones([
      ...milestones,
      { title: `Milestone ${milestones.length + 1}`, criteria: '', bps: 0 },
    ]);
  }

  function removeMilestone(idx) {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== idx));
  }

  function updateMilestone(idx, field, value) {
    const updated = [...milestones];
    updated[idx][field] = value;
    setMilestones(updated);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!cid.trim() || !title.trim() || !desc.trim() || !beneficiary.trim()) {
      setError('Please fill in all campaign header fields.');
      return;
    }

    if (totalBps !== 10000) {
      setError(`Milestone percentage split must equal exactly 100% (currently ${totalBps / 100}%).`);
      return;
    }

    const targetAtto = parseEthToAtto(targetEth);
    if (targetAtto <= 0n) {
      setError('Target funding amount must be positive.');
      return;
    }

    const titles = milestones.map((m) => m.title.trim());
    const criteria = milestones.map((m) => m.criteria.trim());
    const bpsArray = milestones.map((m) => BigInt(m.bps));

    onCreate({
      cid: cid.trim(),
      beneficiary: beneficiary.trim(),
      title: title.trim(),
      desc: desc.trim(),
      targetAtto,
      titles,
      criteria,
      bpsArray,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🎯 Launch New Grant Campaign</h2>
        <p className="hint">
          Define your grant scope, funding target, and sequential milestone acceptance criteria.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Campaign Identifier (Unique Slug)</label>
            <input
              style={{ width: '100%' }}
              placeholder="e.g. cross-chain-dex-grant"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Campaign Title</label>
            <input
              style={{ width: '100%' }}
              placeholder="e.g. Next-Gen Cross-Chain Liquidity Hub"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Beneficiary Address (Payout Recipient)</label>
            <input
              style={{ width: '100%' }}
              className="mono"
              placeholder="0x..."
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              placeholder="Describe the grant deliverables, team credentials, and public benefit..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Funding Target (GEN)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              style={{ width: '100%' }}
              value={targetEth}
              onChange={(e) => setTargetEth(e.target.value)}
              required
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Milestones ({milestones.length})</h3>
              <div style={{ fontSize: 13, fontWeight: 700, color: totalBps === 10000 ? 'var(--ok)' : 'var(--warn)' }}>
                Total Allocation: {totalBps / 100}% / 100%
              </div>
            </div>

            {milestones.map((m, idx) => (
              <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input
                    style={{ flex: 3 }}
                    placeholder={`Milestone ${idx + 1} Title`}
                    value={m.title}
                    onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <input
                      type="number"
                      placeholder="BPS (e.g. 3000)"
                      value={m.bps}
                      onChange={(e) => updateMilestone(idx, 'bps', parseInt(e.target.value) || 0)}
                      required
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({(m.bps / 100).toFixed(0)}%)</span>
                  </div>
                  {milestones.length > 1 && (
                    <button type="button" className="ghost" style={{ padding: '0 8px', color: 'var(--danger)' }} onClick={() => removeMilestone(idx)}>
                      ✕
                    </button>
                  )}
                </div>
                <textarea
                  style={{ minHeight: 50, fontSize: 13 }}
                  placeholder="Objective Acceptance Criteria (What must be verified for release?)"
                  value={m.criteria}
                  onChange={(e) => updateMilestone(idx, 'criteria', e.target.value)}
                  required
                />
              </div>
            ))}

            <button type="button" className="ghost" style={{ width: '100%', fontSize: 13 }} onClick={addMilestone}>
              + Add Milestone
            </button>
          </div>

          {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy || totalBps !== 10000}>
              {busy ? 'Launching Campaign…' : '🚀 Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
