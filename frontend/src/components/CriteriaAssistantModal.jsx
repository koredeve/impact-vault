import React, { useState } from 'react';

export function CriteriaAssistantModal({ isOpen, onClose, onApplyCriteria }) {
  const [grantCategory, setGrantCategory] = useState('DeFi');
  const [goalDesc, setGoalDesc] = useState('');
  const [generatedMilestones, setGeneratedMilestones] = useState(null);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  function generateDraftCriteria() {
    setGenerating(true);
    setTimeout(() => {
      const summary = goalDesc.trim() || 'Core protocol development';
      const drafts = [
        {
          title: 'Milestone 1: Mathematical Spec & Open Source Code',
          criteria: `Complete technical specification and public GitHub repository for ${summary} with automated CI test pipeline achieving > 85% branch coverage.`,
          bps: 3000,
        },
        {
          title: 'Milestone 2: Testnet Deployment & Functional UI',
          criteria: `Deploy smart contract implementation to GenLayer StudioNet with verified contracts and responsive frontend DApp enabling user interaction and transaction execution.`,
          bps: 3500,
        },
        {
          title: 'Milestone 3: Security Review & Documentation',
          criteria: `Publish independent security review or fuzzing test audit resolving all high/medium vulnerabilities, accompanied by end-user guides and deployment tutorials.`,
          bps: 3500,
        },
      ];
      setGeneratedMilestones(drafts);
      setGenerating(false);
    }, 600);
  }

  function handleApply() {
    if (!generatedMilestones) return;
    onApplyCriteria(generatedMilestones);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>✨ AI Grant Criteria Architect</h2>
        <p className="hint">
          GenLayer AI validators evaluate objective, unambiguous proof. Describe what you're building,
          and this assistant will generate milestone criteria formatted for 0% consensus ambiguity.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Grant Domain / Category</label>
          <select
            style={{ width: '100%' }}
            value={grantCategory}
            onChange={(e) => setGrantCategory(e.target.value)}
          >
            <option value="DeFi">DeFi & Automated Market Makers</option>
            <option value="AI / Agents">Autonomous AI Agents & Oracles</option>
            <option value="Infrastructure">Infrastructure & Cross-Chain Bridges</option>
            <option value="Public Goods">Public Goods & Open Source Tooling</option>
            <option value="Security & Audits">Security & Formal Verification</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>What are the core deliverables of your project?</label>
          <textarea
            rows={3}
            placeholder="e.g. Building an automated AI yield optimizer that routes capital between liquidity pools based on real-time volatility feeds..."
            value={goalDesc}
            onChange={(e) => setGoalDesc(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button type="button" onClick={generateDraftCriteria} disabled={generating}>
            {generating ? 'Architecting Criteria…' : '🪄 Generate Verifiable Milestones'}
          </button>
        </div>

        {generatedMilestones && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ fontSize: 14, margin: '0 0 10px', color: 'var(--accent-hover)' }}>
              Generated Milestone Roadmap (3-Tranche Split):
            </h3>
            {generatedMilestones.map((m, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}>
                  <span>{m.title}</span>
                  <span className="pill cyan">{m.bps / 100}%</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.criteria}</div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button type="button" className="ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="success" onClick={handleApply}>
                ✓ Import Into Campaign Wizard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
