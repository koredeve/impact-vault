import React, { useState } from 'react';
import { truncateHash } from '../lib.js';
import { switchOrAddStudioNet } from '../genlayer.js';

export function WalletCard({ me, onConnect, onDisconnect }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleConnect() {
    setError('');
    if (typeof window.ethereum === 'undefined') {
      setError('No browser wallet extension (MetaMask / Rabby / Coinbase Wallet) detected in window.ethereum.');
      return;
    }
    setConnecting(true);
    try {
      // 1. Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setError('No account selected or permission denied.');
        return;
      }
      const selectedAccount = accounts[0];

      // 2. Automatically prompt to add / switch to GenLayer StudioNet (chainId 4224 / 0x1080)
      try {
        await switchOrAddStudioNet(window.ethereum);
      } catch (netErr) {
        console.warn('StudioNet network switch warning:', netErr);
      }

      // 3. Complete connection with injected provider
      onConnect(selectedAccount, window.ethereum);
    } catch (err) {
      setError('Wallet connection failed: ' + (err?.message || String(err)));
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

  if (me) {
    return (
      <div className="walletbox">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="pill ok" style={{ fontSize: 10, padding: '2px 8px' }}>
                ● Connected
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Browser Wallet (MetaMask / Rabby)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{truncateHash(me, 8, 6)}</span>
              <button className="ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={copyAddr}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="https://faucet-studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="ghost"
              style={{ padding: '7px 12px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              💧 Faucet (Get Testnet GEN)
            </a>
            <button className="ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="walletbox">
      <p className="hint">
        Connect your browser extension wallet (MetaMask, Rabby, Coinbase Wallet) to interact with ImpactVault on GenLayer StudioNet:
      </p>
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          style={{ width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 700 }}
        >
          🦊 {connecting ? 'Connecting & Switching to StudioNet…' : 'Connect Wallet (MetaMask / Rabby)'}
        </button>
      </div>
      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
