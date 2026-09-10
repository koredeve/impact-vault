import React, { useState } from 'react';
import { formatAtto, truncateHash } from '../../lib.js';
import { CampaignCard } from '../CampaignCard.jsx';

export function PortfolioView({
  me,
  credits,
  campaigns,
  onSelectCampaign,
  onClaimPayout,
  onClaimRefund,
  onOpenCreate,
  onOpenConnect,
  busy,
}) {
  const [subTab, setSubTab] = useState('created'); // 'created', 'backed'

  if (!me) {
    return (
      <div className="portfolio-view" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 36, borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🦊</div>
          <h2 style={{ fontSize: 22, margin: '0 0 8px', fontWeight: 800 }}>Connect Your Wallet</h2>
          <p className="hint" style={{ fontSize: 14, margin: '0 0 20px' }}>
            Connect MetaMask or Rabby to manage your created grant vaults, withdraw earned milestone tranches, and view your backed projects.
          </p>
          <button onClick={onOpenConnect} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700 }}>
            🦊 Connect Wallet (StudioNet)
          </button>
        </div>
      </div>
    );
  }

  const myCreated = campaigns.filter(
    (c) => c.creator?.toLowerCase() === me.toLowerCase() || c.beneficiary?.toLowerCase() === me.toLowerCase()
  );

  const myBacked = campaigns.filter((c) => {
    if (!Array.isArray(c.backers)) return false;
    return c.backers.some((b) => b.address?.toLowerCase() === me.toLowerCase());
  });

  return (
    <div className="portfolio-view" style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header & Earnings Card */}
      <div className="card" style={{ padding: 24, borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="pill ok" style={{ fontSize: 10 }}>● Connected</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{truncateHash(me, 8, 6)}</span>
            </div>
            <h2 style={{ fontSize: 22, margin: '4px 0 0', fontWeight: 800 }}>💼 Creator & Backer Portfolio</h2>
          </div>

          {/* Withdrawable Earnings / Pull Payment */}
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 12,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Withdrawable Tranche Earnings
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ok)' }}>
                {formatAtto(credits)} GEN
              </div>
            </div>

            <button
              className="success"
              onClick={onClaimPayout}
              disabled={Boolean(busy) || credits <= 0n}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: credits > 0n ? '0 0 15px rgba(34, 197, 94, 0.4)' : 'none',
              }}
            >
              {busy === 'claim_payout' ? 'Claiming…' : '📥 Withdraw Payout'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          type="button"
          className={`tab-btn ${subTab === 'created' ? 'active' : ''}`}
          onClick={() => setSubTab('created')}
        >
          🎯 My Created / Managed Vaults ({myCreated.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${subTab === 'backed' ? 'active' : ''}`}
          onClick={() => setSubTab('backed')}
        >
          💳 Grants I've Backed ({myBacked.length})
        </button>
      </div>

      {/* SUBTAB 1: My Created */}
      {subTab === 'created' && (
        <div>
          {myCreated.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 36 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
              <h3 style={{ fontSize: 16, margin: '0 0 6px', fontWeight: 700 }}>No active grant vaults created yet</h3>
              <p className="hint" style={{ fontSize: 13, margin: '0 0 16px' }}>
                Launch a milestone-gated project with sequential tranches verified by AI validators.
              </p>
              <button onClick={onOpenCreate} style={{ padding: '8px 18px', fontSize: 13 }}>
                + Launch Your First Grant Vault
              </button>
            </div>
          ) : (
            <div className="campaigns-grid">
              {myCreated.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onSelect={onSelectCampaign}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: My Backed */}
      {subTab === 'backed' && (
        <div>
          {myBacked.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 36 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
              <h3 style={{ fontSize: 16, margin: '0 0 6px', fontWeight: 700 }}>You haven't backed any projects yet</h3>
              <p className="hint" style={{ fontSize: 13, margin: '0 0 16px' }}>
                Browse open grant vaults and pool capital toward milestone-verified Web3 initiatives.
              </p>
            </div>
          ) : (
            <div className="campaigns-grid">
              {myBacked.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onSelect={onSelectCampaign}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
