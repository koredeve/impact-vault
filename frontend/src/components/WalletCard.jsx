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

export function WalletCard({ me, onUnlock, onLock }) {
  const [hasKeystore, setHasKeystore] = useState(() => hasSavedKeystore());
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [mode, setMode] = useState(hasKeystore ? 'unlock' : 'instant');
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
      setMode('instant');
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
                StudioNet Gasless Burner
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
      {hasKeystore && mode === 'unlock' ? (
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
            <button type="button" className="ghost" onClick={() => setMode('instant')}>
              Use Instant Burner
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSave}>
          <p className="hint">
            Connect to StudioNet with a gasless in-app burner wallet or password-encrypted keystore:
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button type="button" className="success" style={{ flex: '1 1 180px', padding: '9px 14px', fontSize: 13 }} onClick={handleInstantDemo}>
              ⚡ 1-Click Instant Demo Burner
            </button>
            <button type="button" className="ghost" style={{ flex: '1 1 160px', padding: '9px 14px', fontSize: 13 }} onClick={handleGenerate}>
              🔐 Generate & Encrypt Key
            </button>
          </div>

          {mode === 'create' && (
            <div>
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
                <button type="button" className="ghost" onClick={() => setMode('instant')}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {hasKeystore && (
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
