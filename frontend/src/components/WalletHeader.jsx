import React, { useState } from 'react';
import { truncateHash } from '../lib.js';
import { ConnectWalletModal } from './ConnectWalletModal.jsx';

export const FAUCET_URL = 'https://testnet-faucet.genlayer.foundation/';

export function WalletHeader({ me, onConnect, onDisconnect }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyAddr() {
    if (!me) return;
    navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="wallet-header-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <a
        href={FAUCET_URL}
        target="_blank"
        rel="noreferrer"
        className="ghost nav-faucet-btn"
        style={{
          padding: '8px 14px',
          fontSize: 13,
          borderRadius: 8,
          border: '1px solid var(--border)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
          color: 'var(--text)',
        }}
      >
        💧 Faucet
      </a>

      {me ? (
        <div className="wallet-connected-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span className="pill ok" style={{ fontSize: 10, padding: '2px 6px' }}>● Connected</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{truncateHash(me, 6, 4)}</span>
          <button className="ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={copyAddr} title="Copy Address">
            {copied ? '✓' : 'Copy'}
          </button>
          <button className="ghost" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--text-muted)' }} onClick={onDisconnect} title="Disconnect Wallet">
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            padding: '9px 18px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            boxShadow: '0 0 15px var(--accent-glow)',
            cursor: 'pointer',
          }}
        >
          🦊 Connect Wallet
        </button>
      )}

      <ConnectWalletModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnectSuccess={(address, provider, signature) => {
          onConnect(address, provider);
        }}
      />
    </div>
  );
}
