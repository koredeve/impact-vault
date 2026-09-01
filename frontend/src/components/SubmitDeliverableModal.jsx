import React, { useState } from 'react';

export function SubmitDeliverableModal({ isOpen, onClose, campaign, milestoneIdx, milestone, onSubmit, busy }) {
  const [desc, setDesc] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !campaign || milestoneIdx === undefined) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!desc.trim()) {
      setError('Please provide a description of the completed work.');
      return;
    }

    const rawUrls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    for (const u of rawUrls) {
      if (!u.startsWith('https://')) {
        setError(`All evidence URLs must start with https:// (invalid: ${u})`);
        return;
      }
    }

    onSubmit({
      campaignId: campaign.id,
      milestoneIdx,
      desc: desc.trim(),
      evidenceUrls: rawUrls,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>📤 Submit Milestone Deliverable</h2>
        <p className="hint">
          Submit evidence for <strong>{milestone?.title || `Milestone #${milestoneIdx + 1}`}</strong> of campaign <em>{campaign.title}</em>.
        </p>

        <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--border-active)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-hover)', textTransform: 'uppercase' }}>Target Acceptance Criteria</div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text)' }}>{milestone?.criteria}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Work Summary & Deliverable Description</label>
            <textarea
              rows={4}
              placeholder="Detail the completed features, architectures, test results, and deployment notes..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Evidence Links (One HTTPS URL per line)</label>
            <textarea
              rows={3}
              placeholder="https://github.com/org/repo/commit/...\nhttps://explorer-studio.genlayer.com/address/...\nhttps://audit-report.example.com"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Must include https:// prefix for validator retrieval.</span>
          </div>

          {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !desc.trim()}>
              {busy ? 'Submitting to Chain…' : 'Submit for AI Consensus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
