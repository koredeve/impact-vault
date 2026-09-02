import React, { useState } from 'react';
import { parseEthToAtto, CATEGORIES, CRITERIA_TEMPLATES } from '../lib.js';

export function CreateCampaignModal({ isOpen, onClose, onCreate, onOpenAssistant, busy, presetMilestones }) {
  const [cid, setCid] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [category, setCategory] = useState('DeFi');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [targetEth, setTargetEth] = useState('5.0');
  
  const [milestones, setMilestones] = useState(
    presetMilestones || [
      { title: 'Milestone 1: Architecture Spec & Prototype', criteria: 'Public GitHub repo with working prototype and unit test coverage > 80%', bps: 3000 },
      { title: 'Milestone 2: StudioNet Testnet Protocol', criteria: 'Deploy protocol on StudioNet with interactive frontend demo', bps: 3500 },
      { title: 'Milestone 3: Mainnet Launch & Security Review', criteria: 'Security audit report completed with all findings resolved', bps: 3500 },
    ]
  );

  const [error, setError] = useState('');

  // Sync if presetMilestones updated by AI assistant
  React.useEffect(() => {
    if (presetMilestones) {
      setMilestones(presetMilestones);
    }
  }, [presetMilestones]);

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

  function applyTemplate(tmpl) {
    setMilestones([
      ...milestones,
      { title: tmpl.title, criteria: tmpl.criteria, bps: tmpl.defaultBps },
    ]);
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
      category: category.trim(),
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2>🎯 Launch New Grant Vault</h2>
            <p className="hint" style={{ margin: 0 }}>
              Lock crowdfunding capital in sequential milestone tranches verified by AI validators.
            </p>
          </div>
          <button type="button" className="ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={onOpenAssistant}>
            ✨ AI Assistant
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Unique Identifier (Slug)</label>
              <input
                style={{ width: '100%' }}
                placeholder="e.g. cross-chain-dex-grant"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Category</label>
              <select
                style={{ width: '100%' }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Grant Title</label>
            <input
              style={{ width: '100%' }}
              placeholder="e.g. Next-Gen Cross-Chain Liquidity Hub"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
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
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Target Goal (GEN)</label>
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
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Project Narrative & Impact Scope</label>
            <textarea
              placeholder="Describe the grant deliverables, technical architecture, and ecosystem public goods value..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Milestone Roadmap ({milestones.length})</h3>
              <div style={{ fontSize: 13, fontWeight: 700, color: totalBps === 10000 ? 'var(--ok)' : 'var(--warn)' }}>
                Allocation: {totalBps / 100}% / 100% {totalBps === 10000 ? '✓' : '⚠️ Must equal 100%'}
              </div>
            </div>

            {/* Quick Template Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>+ Add Template:</span>
              {CRITERIA_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ghost"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => applyTemplate(tmpl)}
                >
                  + {tmpl.name}
                </button>
              ))}
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
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 35 }}>({(m.bps / 100).toFixed(0)}%)</span>
                  </div>
                  {milestones.length > 1 && (
                    <button type="button" className="ghost" style={{ padding: '0 8px', color: 'var(--danger)' }} onClick={() => removeMilestone(idx)}>
                      ✕
                    </button>
                  )}
                </div>
                <textarea
                  style={{ minHeight: 45, fontSize: 13 }}
                  placeholder="Objective Acceptance Criteria (Evaluated by GenLayer AI validators)"
                  value={m.criteria}
                  onChange={(e) => updateMilestone(idx, 'criteria', e.target.value)}
                  required
                />
              </div>
            ))}

            <button type="button" className="ghost" style={{ width: '100%', fontSize: 13 }} onClick={addMilestone}>
              + Add Custom Milestone
            </button>
          </div>

          {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy || totalBps !== 10000}>
              {busy ? 'Deploying to StudioNet…' : '🚀 Launch Grant Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
