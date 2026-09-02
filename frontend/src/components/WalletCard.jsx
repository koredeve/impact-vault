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

export function WalletCard({ me, walletType, onUnlock, onConnectExtension, onLock }) {
  const [hasKeystore, setHasKeystore] = useState(() => hasSavedKeystore());
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [mode, setMode] = useState(hasKeystore ? 'unlock' : 'import');
  const [tab, setTab] = useState('keystore'); // 'keystore' or 'extension'
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleUnlock(e) {
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

  async function handleSave(e) {
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

  function handleGenerate() {
    const pk = generateNewPrivateKey();
    setPrivateKeyInput(pk);
    setMode('create');
  }

  function handleLock() {
    onLock();
    setPassword('');
  }

  function handleClear() {
    if (confirm('Clear encrypted keystore from browser local storage?')) {
      clearSavedKeystore();
      setHasKeystore(false);
      onLock();
      setMode('import');
    }
  }

  function copyAddr() {
    if (!me) return;
    navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function connectMetaMask() {
    setError('');
    if (typeof window.ethereum === 'undefined') {
      setError('No browser wallet extension (MetaMask / Rabby) detected in window.ethereum.');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        onConnectExtension(accounts[0]);
      }
    } catch (err) {
      setError('Extension connection failed: ' + (err?.message || String(err)));
    }
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
                {walletType === 'extension' ? 'Browser Extension' : 'StudioNet Burner'}
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
            <button className="ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={handleLock}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="walletbox">
      <div className="wallet-tabs" style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`tab-btn ${tab === 'keystore' ? 'active' : ''}`}
          style={{ fontSize: 12, padding: '6px 10px', flex: '1 1 130px', textAlign: 'center' }}
          onClick={() => setTab('keystore')}
        >
          🔐 Keystore (Gasless)
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'extension' ? 'active' : ''}`}
          style={{ fontSize: 12, padding: '6px 10px', flex: '1 1 130px', textAlign: 'center' }}
          onClick={() => setTab('extension')}
        >
          🦊 Browser Wallet
        </button>
      </div>

      {tab === 'extension' ? (
        <div>
          <p className="hint">Connect your browser extension wallet (MetaMask, Rabby, Coinbase Wallet):</p>
          <button type="button" onClick={connectMetaMask} style={{ width: '100%', marginTop: 4 }}>
            🦊 Connect Browser Extension
          </button>
        </div>
      ) : hasKeystore && mode === 'unlock' ? (
        <form onSubmit={handleUnlock}>
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
              Unlock Account
            </button>
            <button type="button" className="ghost" onClick={() => setMode('import')}>
              Use Other Key
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSave}>
          <p className="hint">
            {mode === 'create'
              ? 'New burner key generated. Set a password to encrypt in browser or connect instantly:'
              : 'Choose an instant demo burner or set an encrypted password:'}
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button type="button" className="success" style={{ flex: '1 1 160px', padding: '9px 14px', fontSize: 13 }} onClick={handleInstantDemo}>
              ⚡ 1-Click Instant Demo Burner
            </button>
            <button type="button" className="ghost" style={{ flex: '1 1 140px', padding: '9px 14px', fontSize: 13 }} onClick={handleGenerate}>
              🎲 Generate Key to Encrypt
            </button>
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <input
              type="password"
              placeholder="Private key (0x...)"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
            />
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
            {hasKeystore && (
              <button type="button" className="ghost" onClick={() => setMode('unlock')}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {hasKeystore && tab === 'keystore' && (
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button type="button" className="ghost" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--danger)' }} onClick={handleClear}>
            Clear stored keystore
          </button>
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
