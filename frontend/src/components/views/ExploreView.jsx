import React, { useState } from 'react';
import { CampaignCard } from '../CampaignCard.jsx';
import { CATEGORIES } from '../../lib.js';

export function ExploreView({
  campaigns,
  loading,
  me,
  onSelectCampaign,
  onFund,
  onSubmitDeliverable,
  onEvaluateMilestone,
  onCancel,
  onClaimRefund,
  busy,
  onOpenCreate,
  onOpenAssistant,
  onRefresh,
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = campaigns.filter((c) => {
    if (selectedCategory !== 'ALL' && c.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (statusFilter !== 'ALL' && c.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchCat = c.category?.toLowerCase().includes(q);
      const matchId = c.id?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="explore-view">
      <div className="view-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 24, margin: '0 0 6px', fontWeight: 800 }}>🌐 Active Grant Vaults</h2>
            <p className="hint" style={{ margin: 0, fontSize: 14 }}>
              Browse milestone-gated Web3 grants. Capital is trustlessly released via non-deterministic AI validator consensus.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost" onClick={onRefresh} disabled={loading} style={{ fontSize: 13, padding: '8px 14px' }}>
              {loading ? '↻ Refreshing…' : '↻ Refresh'}
            </button>
            <button className="ghost" onClick={onOpenAssistant} style={{ fontSize: 13, padding: '8px 14px' }}>
              ✨ AI Architect
            </button>
            <button onClick={onOpenCreate} style={{ fontSize: 13, padding: '8px 16px' }}>
              + Launch Vault
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 240px' }}>
            <input
              type="text"
              placeholder="Search by project name, description, slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 14px', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'funding', 'active', 'completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`ghost ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    textTransform: 'capitalize',
                    background: statusFilter === st ? 'var(--accent)' : 'transparent',
                    color: statusFilter === st ? '#fff' : 'var(--text-muted)',
                    borderColor: statusFilter === st ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`ghost ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 20,
              background: selectedCategory === 'ALL' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              borderColor: selectedCategory === 'ALL' ? 'var(--accent)' : 'var(--border)',
              color: selectedCategory === 'ALL' ? 'var(--accent-hover)' : 'var(--text-muted)',
            }}
          >
            All Categories ({campaigns.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = campaigns.filter((c) => c.category?.toLowerCase() === cat.toLowerCase()).length;
            const isSel = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                className={`ghost ${isSel ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  borderRadius: 20,
                  background: isSel ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  borderColor: isSel ? 'var(--accent)' : 'var(--border)',
                  color: isSel ? 'var(--accent-hover)' : 'var(--text-muted)',
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Campaigns */}
      {loading && campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Loading StudioNet Grant Vaults…</div>
          <p className="hint" style={{ fontSize: 13 }}>Fetching on-chain state from GenLayer StudioNet RPC</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>No matching grant vaults found</div>
          <p className="hint" style={{ fontSize: 13, margin: '6px 0 16px' }}>
            Try adjusting your search criteria or category filter.
          </p>
          <button onClick={onOpenCreate} style={{ padding: '8px 16px', fontSize: 13 }}>
            + Launch First Grant Vault in this Category
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {filtered.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              me={me}
              onSelect={onSelectCampaign}
              onFund={onFund}
              onSubmitDeliverable={onSubmitDeliverable}
              onEvaluateMilestone={onEvaluateMilestone}
              onCancel={onCancel}
              onClaimRefund={onClaimRefund}
              busy={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
