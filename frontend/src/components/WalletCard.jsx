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

export function WalletCard({ me, onUnlock, onLock }) {
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState(hasSavedKeystore() ? 'unlock' : 'import');
  const [hasKeystore, setHasKeystore] = useState(hasSavedKeystore());
  const [copied, setCopied] = useState(false);

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
      onUnlock(pk, addr);
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
      onUnlock(pk, addr);
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

  if (me) {
    return (
      <div className="walletbox">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Connected Account</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{truncateHash(me, 10, 8)}</span>
              <button className="ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={copyAddr}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href="https://faucet-studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="ghost"
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center' }}
            >
              💧 Get Testnet GEN
            </a>
            <button className="ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleLock}>
              Lock
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
              : 'Import existing private key (or generate a new burner) to interact with ImpactVault:'}
          </p>
          <div className="row" style={{ marginBottom: 10 }}>
            <input
              type="password"
              placeholder="Private key (0x...)"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
            />
            <button type="button" className="ghost" onClick={handleGenerate}>
              🎲 Generate Key
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
