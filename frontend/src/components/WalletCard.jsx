import React, { useState, useEffect } from 'react';
import {
  saveKeystore,
  loadKeystore,
  hasSavedKeystore,
  clearSavedKeystore,
  generateNewPrivateKey,
  addressForPrivateKey,
  truncateHash,
} from '../lib.js';

export function WalletCard({ me, onUnlock, onLock, walletType, onConnectExtension }) {
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState(hasSavedKeystore() ? 'unlock' : 'import');
  const [hasKeystore, setHasKeystore] = useState(hasSavedKeystore());
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('keystore'); // 'keystore' or 'extension'

  useEffect(() => {
    setHasKeystore(hasSavedKeystore());
  }, [me]);

  async function handleUnlock(e) {
    e.preventDefault();
    setError('');
    try {
      const pk = await loadKeystore(password);
      if (!pk) {
        setError('Incorrect password or invalid keystore.');
        return;
      }
      const addr = addressForPrivateKey(pk);
      onUnlock(pk, addr, 'keystore');
      setPassword('');
    } catch {
      setError('Failed to decrypt keystore. Check password.');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    let pk = privateKeyInput.trim();
    if (!pk) {
      setError('Private key is required.');
      return;
    }
    if (!pk.startsWith('0x')) pk = '0x' + pk;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      const addr = await saveKeystore(password, pk);
      onUnlock(pk, addr, 'keystore');
      setHasKeystore(true);
      setPassword('');
      setPrivateKeyInput('');
    } catch (err) {
      setError('Failed to encrypt keystore: ' + err.message);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pill ok" style={{ fontSize: 10, padding: '2px 8px' }}>
                {walletType === 'extension' ? '🦊 Browser Wallet' : '🔐 StudioNet Keystore'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 16 }}>{truncateHash(me, 10, 8)}</span>
              <button className="ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={copyAddr}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a
              href="https://faucet-studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="ghost"
              style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              💧 Faucet (Get Testnet GEN)
            </a>
            <button className="ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={handleLock}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="walletbox">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className={`tab-btn ${tab === 'keystore' ? 'active' : ''}`}
          style={{ fontSize: 12, padding: '6px 12px' }}
          onClick={() => setTab('keystore')}
        >
          🔐 StudioNet Burner / Keystore (Instant & Gasless)
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'extension' ? 'active' : ''}`}
          style={{ fontSize: 12, padding: '6px 12px' }}
          onClick={() => setTab('extension')}
        >
          🦊 Browser Wallet (MetaMask / Rabby)
        </button>
      </div>

      {tab === 'extension' ? (
        <div>
          <p className="hint">Connect your browser extension wallet (MetaMask, Rabby, Coinbase Wallet) to sign transactions:</p>
          <button type="button" onClick={connectMetaMask} style={{ marginTop: 4 }}>
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
              Use Different Key
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSave}>
          <p className="hint">
            {mode === 'create'
              ? 'New private key generated. Set a password to encrypt it in your browser:'
              : 'Import private key or generate a burner account with 1 click:'}
          </p>
          <div className="row" style={{ marginBottom: 10 }}>
            <input
              type="password"
              placeholder="Private key (0x...)"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
            />
            <button type="button" className="ghost" onClick={handleGenerate}>
              🎲 Generate Burner Key
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
