import React, { useState, useEffect } from 'react';
import { parseEthToAtto, CATEGORIES, CRITERIA_TEMPLATES } from '../../lib.js';

export function LaunchVaultView({
  onCreate,
  onOpenAssistant,
  presetMilestones,
  busy,
  me,
  onOpenConnect,
}) {
  const [cid, setCid] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [category, setCategory] = useState('DeFi');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [targetEth, setTargetEth] = useState('5.0');

  const [milestones, setMilestones] = useState([
    {
      title: 'Milestone 1: Mathematical Spec & Open Source Code',
      criteria: 'Complete technical specification and public GitHub repository with automated CI test pipeline achieving > 85% branch coverage.',
      bps: 3000,
    },
    {
      title: 'Milestone 2: Testnet Deployment & Functional UI',
      criteria: 'Deploy smart contract implementation to GenLayer StudioNet with verified contracts and responsive frontend DApp enabling user interaction and transaction execution.',
      bps: 3500,
    },
    {
      title: 'Milestone 3: Security Review & Documentation',
      criteria: 'Publish independent security review or fuzzing test audit resolving all high/medium vulnerabilities, accompanied by end-user guides and deployment tutorials.',
      bps: 3500,
    },
  ]);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-fill beneficiary with connected wallet
  useEffect(() => {
    if (me && !beneficiary) {
      setBeneficiary(me);
    }
  }, [me]);

  // Sync if presetMilestones updated by AI assistant
  useEffect(() => {
    if (presetMilestones && Array.isArray(presetMilestones) && presetMilestones.length > 0) {
      setMilestones(presetMilestones);
    }
  }, [presetMilestones]);

  const totalBps = milestones.reduce((sum, m) => sum + (parseInt(m.bps) || 0), 0);
  const isValidBps = totalBps === 10000;

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
    setSuccessMsg('');

    if (!me) {
      setError('Please connect your browser wallet (MetaMask / Rabby) first to sign this transaction.');
      if (onOpenConnect) onOpenConnect();
      return;
    }

    if (!cid.trim() || !title.trim() || !desc.trim() || !beneficiary.trim()) {
      setError('Please fill in all grant header fields (Identifier, Title, Description, and Beneficiary).');
      return;
    }

    if (!isValidBps) {
      setError(`Milestone percentage split must equal exactly 100% (currently ${totalBps / 100}%).`);
      return;
    }

    const targetAtto = parseEthToAtto(targetEth);
    if (targetAtto <= 0n) {
      setError('Target funding amount must be positive.');
      return;
    }

    for (let i = 0; i < milestones.length; i++) {
      if (!milestones[i].title.trim() || !milestones[i].criteria.trim()) {
        setError(`Milestone #${i + 1} must have a title and objective acceptance criteria.`);
        return;
      }
      if (parseInt(milestones[i].bps) <= 0) {
        setError(`Milestone #${i + 1} allocation percentage must be positive.`);
        return;
      }
    }

    const titles = milestones.map((m) => m.title.trim());
    const criteria = milestones.map((m) => m.criteria.trim());
    const bpsArray = milestones.map((m) => BigInt(m.bps));

    onCreate({
      cid: cid.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
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
    <div className="launch-vault-view" style={{ maxWidth: 840, margin: '0 auto' }}>
      <div className="card" style={{ padding: 28, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 24, margin: '0 0 6px', fontWeight: 800 }}>➕ Launch Milestone-Gated Grant Vault</h2>
            <p className="hint" style={{ margin: 0, fontSize: 14 }}>
              Lock crowdfunding capital in sequential tranches released trustlessly upon GenLayer AI validator consensus.
            </p>
          </div>
          <button
            type="button"
            className="ghost"
            style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={onOpenAssistant}
          >
            ✨ AI Criteria Architect
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Unique Slug Identifier</label>
              <input
                style={{ width: '100%' }}
                placeholder="e.g. cross-chain-dex-grant"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                required
              />
              <span className="hint" style={{ fontSize: 11 }}>Permanent immutable contract key</span>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Domain Category</label>
              <select
                style={{ width: '100%', padding: '10px 12px' }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Project Title</label>
            <input
              style={{ width: '100%' }}
              placeholder="e.g. GenLayer AMM & Concentrated Liquidity DEX"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Project Summary & Impact Description</label>
            <textarea
              rows={3}
              placeholder="Describe the architectural goals, mission, user benefits, and technical specifications..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Target Crowdfunding Goal (GEN)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                style={{ width: '100%' }}
                placeholder="5.0"
                value={targetEth}
                onChange={(e) => setTargetEth(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Beneficiary Payout Address</label>
              <input
                style={{ width: '100%' }}
                placeholder="0x..."
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                required
              />
              <span className="hint" style={{ fontSize: 11 }}>Receives unlocked tranches via pull-withdrawal</span>
            </div>
          </div>

          {/* Milestone Builder */}
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Sequential Milestone Roadmap</h3>
                <span className="hint" style={{ fontSize: 12 }}>
                  Tranches unlock in strict sequential order upon AI validator approval
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: isValidBps ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isValidBps ? 'var(--ok)' : 'var(--danger)',
                    border: `1px solid ${isValidBps ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  Total Split: {totalBps / 100}% / 100%
                </div>
                <button type="button" className="ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={addMilestone}>
                  + Add Milestone
                </button>
              </div>
            </div>

            {/* Visual BPS allocation bar */}
            <div style={{ height: 6, width: '100%', background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
              {milestones.map((m, idx) => {
                const widthPct = Math.max(0, Math.min(100, (parseInt(m.bps) || 0) / 100));
                const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
                return (
                  <div
                    key={idx}
                    style={{
                      width: `${widthPct}%`,
                      background: colors[idx % colors.length],
                      height: '100%',
                      transition: 'width 0.3s ease',
                    }}
                    title={`${m.title || `Milestone #${idx + 1}`}: ${m.bps / 100}%`}
                  />
                );
              })}
            </div>

            {/* Milestone items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-hover)' }}>
                      Milestone #{idx + 1}
                    </span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        className="ghost"
                        style={{ padding: '2px 8px', fontSize: 11, color: 'var(--danger)' }}
                        onClick={() => removeMilestone(idx)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 8 }}>
                    <input
                      placeholder={`e.g. Milestone ${idx + 1}: Prototype & Unit Tests`}
                      value={m.title}
                      onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                      required
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        placeholder="BPS (e.g. 3500)"
                        value={m.bps}
                        onChange={(e) => updateMilestone(idx, 'bps', parseInt(e.target.value) || 0)}
                        required
                        style={{ width: '100%' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        ({(parseInt(m.bps) || 0) / 100}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      placeholder="Specify clear, unambiguous criteria for AI validators to verify (e.g. Public GitHub repo with passing test suite > 80% coverage and deployed testnet contract on StudioNet)..."
                      value={m.criteria}
                      onChange={(e) => updateMilestone(idx, 'criteria', e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Templates */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                💡 Quick Criteria Templates:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CRITERIA_TEMPLATES.map((tmpl, tIdx) => (
                  <button
                    key={tIdx}
                    type="button"
                    className="ghost"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => applyTemplate(tmpl)}
                  >
                    + {tmpl.title} ({tmpl.defaultBps / 100}%)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
          {successMsg && <div className="pill ok" style={{ marginBottom: 16, display: 'block', padding: 10 }}>{successMsg}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              disabled={Boolean(busy) || !isValidBps}
              style={{
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                boxShadow: isValidBps ? '0 0 20px var(--accent-glow)' : 'none',
              }}
            >
              {busy === 'create' ? 'Launching on StudioNet…' : '🚀 Launch Grant Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
