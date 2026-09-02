import React, { useState } from 'react';
import {
  generateNewPrivateKey,
  addressForPrivateKey,
  saveKeystore,
  loadKeystore,
  hasSavedKeystore,
  clearSavedKeystore,
  truncateHash,
} from '../lib.js';
import { switchOrAddStudioNet } from '../genlayer.js';

export function WalletCard({ me, walletType, onConnectExtension, onUnlock, onLock }) {
  const [hasKeystore, setHasKeystore] = useState(() => hasSavedKeystore());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectingExt, setConnectingExt] = useState(false);

  async function handleConnectMetaMask() {
    setError('');
    if (typeof window.ethereum === 'undefined') {
      setError('No browser wallet extension (MetaMask / Rabby) detected in your browser.');
      return;
    }
    setConnectingExt(true);
    try {
      // 1. Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setError('No account returned by browser wallet.');
        return;
      }
      const selectedAccount = accounts[0];

      // 2. Ensure network is switched to GenLayer StudioNet
      try {
        await switchOrAddStudioNet(window.ethereum);
      } catch (netErr) {
        console.warn('Network switch error:', netErr);
      }

      // 3. Connect extension provider client
      onConnectExtension(selectedAccount, window.ethereum);
    } catch (err) {
      setError('Connection failed: ' + (err?.message || String(err)));
    } finally {
      setConnectingExt(false);
    }
  }

  function handleInstantDemo() {
    setError('');
    try {
      const pk = generateNewPrivateKey();
      const addr = addressForPrivateKey(pk);
      onUnlock(pk, addr);
    } catch (err) {
      setError(err?.message || 'Failed to generate instant burner');
    }
  }

  async function handleUnlockKeystore(e) {
    e.preventDefault();
    setError('');
    try {
      const pk = await loadKeystore(password);
      const addr = addressForPrivateKey(pk);
      onUnlock(pk, addr);
      setPassword('');
    } catch (err) {
      setError(err?.message || 'Incorrect password for keystore');
    }
  }

  async function handleSaveKeystore(e) {
    e.preventDefault();
    setError('');
    if (!privateKeyInput) {
      setError('Please provide or generate a private key');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      const addr = await saveKeystore(password, privateKeyInput);
      setHasKeystore(true);
      onUnlock(privateKeyInput, addr);
      setPassword('');
      setPrivateKeyInput('');
    } catch (err) {
      setError(err?.message || 'Failed to encrypt and save keystore');
    }
  }

  function handleGenerateKey() {
    const pk = generateNewPrivateKey();
    setPrivateKeyInput(pk);
  }

  function handleClearKeystore() {
    if (confirm('Clear encrypted keystore from browser storage?')) {
      clearSavedKeystore();
      setHasKeystore(false);
      onLock();
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
                {walletType === 'extension' ? '🦊 Browser Wallet (MetaMask / Rabby)' : '⚡ StudioNet Burner'}
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
              💧 Faucet
            </a>
            <button className="ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLock}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="walletbox">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          type="button"
          onClick={handleConnectMetaMask}
          disabled={connectingExt}
          style={{ flex: '2 1 220px', padding: '11px 16px', fontSize: 14, fontWeight: 700 }}
        >
          🦊 {connectingExt ? 'Connecting…' : 'Connect Browser Wallet (MetaMask / Rabby)'}
        </button>
        <button
          type="button"
          className="success"
          onClick={handleInstantDemo}
          style={{ flex: '1 1 180px', padding: '11px 16px', fontSize: 13 }}
        >
          ⚡ 1-Click Instant Demo Burner
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <button
          type="button"
          className="ghost"
          style={{ border: 'none', padding: 0, fontSize: 12, color: 'var(--text-muted)' }}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼ Hide Key Options' : '▶ Advanced Key & Keystore Options'}
        </button>
      </div>

      {showAdvanced && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {hasKeystore ? (
            <form onSubmit={handleUnlockKeystore}>
              <p className="hint">Encrypted StudioNet keystore detected in browser. Enter password to unlock:</p>
              <div className="row">
                <input
                  type="password"
                  placeholder="Keystore Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={!password}>
                  Unlock Keystore
                </button>
                <button type="button" className="ghost" style={{ color: 'var(--danger)' }} onClick={handleClearKeystore}>
                  Clear
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveKeystore}>
              <p className="hint">Import custom private key or generate an encrypted keystore:</p>
              <div className="row" style={{ marginBottom: 10 }}>
                <input
                  type="password"
                  placeholder="Private key (0x...)"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                />
                <button type="button" className="ghost" onClick={handleGenerateKey}>
                  🎲 Generate
                </button>
              </div>
              <div className="row">
                <input
                  type="password"
                  placeholder="Set Encryption Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" disabled={!privateKeyInput || password.length < 6}>
                  Save & Connect
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
