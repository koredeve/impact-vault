import React, { useState } from 'react';
import { switchOrAddStudioNet } from '../genlayer.js';

export function generateNonce(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createSiweMessage(address, chainId = 61999) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://impact-vault-tau.vercel.app';
  const host = typeof window !== 'undefined' ? window.location.host : 'impact-vault-tau.vercel.app';
  const nonce = generateNonce();
  const issuedAt = new Date().toISOString();

  return `${host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to ImpactVault on GenLayer StudioNet\n\nURI: ${origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

export function ConnectWalletModal({ isOpen, onClose, onConnectSuccess }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'connecting' | 'signing' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  async function startConnect() {
    setErrorMsg('');
    if (typeof window.ethereum === 'undefined') {
      setStatus('error');
      setErrorMsg('No browser wallet extension (MetaMask / Rabby / Coinbase) detected.');
      return;
    }

    try {
      setStatus('connecting');
      // 1. Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setStatus('error');
        setErrorMsg('No account selected.');
        return;
      }
      const address = accounts[0];

      // 2. Switch or Add StudioNet (61999 / 0xf22f)
      try {
        await switchOrAddStudioNet(window.ethereum);
      } catch (netErr) {
        console.warn('Network switch warning:', netErr);
      }

      // 3. Request SIWE signature verification (personal_sign)
      setStatus('signing');
      const siweMsg = createSiweMessage(address, 61999);
      
      // Request signature from provider
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [siweMsg, address],
      });

      setStatus('idle');
      onConnectSuccess(address, window.ethereum, signature);
      onClose();
    } catch (err) {
      console.error('Wallet SIWE connect error:', err);
      setStatus('error');
      setErrorMsg(err?.message || 'Signature request was rejected or failed.');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 440, textAlign: 'center', padding: '32px 24px', borderRadius: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            IMPACTVAULT PORTAL
          </span>
        </div>

        <h2 style={{ fontSize: 24, margin: '8px 0 6px', fontWeight: 800 }}>Connect wallet</h2>
        <p className="hint" style={{ fontSize: 14, margin: '0 0 24px' }}>
          Choose how you want to sign in. No transaction fee required.
        </p>

        {status === 'idle' && (
          <div>
            <button
              type="button"
              onClick={startConnect}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
                boxShadow: '0 8px 25px var(--accent-glow)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 22 }}>🦊</span>
              Browser Wallet (MetaMask / Rabby)
            </button>
          </div>
        )}

        {(status === 'connecting' || status === 'signing') && (
          <div style={{ padding: '20px 0' }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                borderRadius: '50%',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 1s linear infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              🦊
            </div>
            <h3 style={{ fontSize: 17, margin: '0 0 6px' }}>
              {status === 'connecting' ? 'Connecting to Wallet…' : 'Confirming Signature in Wallet…'}
            </h3>
            <p className="hint" style={{ fontSize: 13, margin: 0 }}>
              Confirm the signature request in your wallet extension to verify account ownership.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '10px 0' }}>
            <div className="error" style={{ marginBottom: 16, textAlign: 'left' }}>
              {errorMsg}
            </div>
            <button
              type="button"
              onClick={startConnect}
              style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 10 }}
            >
              🔄 Try Again
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            type="button"
            className="ghost"
            onClick={onClose}
            style={{ width: '100%', padding: '10px', fontSize: 13 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
