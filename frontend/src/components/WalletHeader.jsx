import React, { useState } from 'react';
import { truncateHash } from '../lib.js';
import { switchOrAddStudioNet } from '../genlayer.js';

export const FAUCET_URL = 'https://testnet-faucet.genlayer.foundation/';

export function WalletHeader({ me, onConnect, onDisconnect }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleConnect() {
    setError('');
    if (typeof window.ethereum === 'undefined') {
      alert('No browser wallet extension (MetaMask, Rabby, Coinbase Wallet) detected. Please install MetaMask or Rabby.');
      return;
    }
    setConnecting(true);
    try {
      // 1. Request account
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setError('No account selected.');
        return;
      }
      const selectedAccount = accounts[0];

      // 2. Switch or Add StudioNet (61999 / 0xf22f)
      try {
        await switchOrAddStudioNet(window.ethereum);
      } catch (netErr) {
        console.warn('StudioNet network switch warning:', netErr);
      }

      onConnect(selectedAccount, window.ethereum);
    } catch (err) {
      setError('Connection failed: ' + (err?.message || String(err)));
    } finally {
      setConnecting(false);
    }
  }

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
          onClick={handleConnect}
          disabled={connecting}
          style={{
            padding: '9px 18px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            boxShadow: '0 0 15px var(--accent-glow)',
          }}
        >
          🦊 {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}

      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger)', width: '100%', textAlign: 'right' }}>
          {error}
        </div>
      )}
    </div>
  );
}
