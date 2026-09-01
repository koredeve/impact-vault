# ImpactVault — Milestone-Gated DAO Grants & Crowdfunding Protocol

**ImpactVault** is a decentralized grant and crowdfunding protocol built natively on **GenLayer**. Capital is locked in sequential milestone-gated vaults and trustlessly released in tranches only when AI-validators verify that submitted deliverables satisfy immutable acceptance criteria.

---

## 🎯 The Problem ImpactVault Solves

In traditional Web3 grants (e.g. Gitcoin, DAO treasury programs) and crowdfunding platforms, recipients frequently collect 100% of upfront funds and abandon the project ("rug pull" or ghosting). 

Traditional EVM smart contracts cannot evaluate natural language deliverables or verify whether real software was deployed. **ImpactVault leverages GenLayer's AI-powered Intelligent Contracts** to solve this:
1. Grants are split into sequential **milestones** with defined basis-point allocations (e.g. 25%, 35%, 40% = 100%).
2. Each milestone defines strict, immutable **Acceptance Criteria**.
3. Project creators submit verifiable work (deliverable summaries, GitHub commits, testnet deployments, audit reports).
4. **GenLayer AI Validators** independently inspect deliverables against criteria and achieve consensus on whether to unlock the next funding tranche.
5. If a project is cancelled or abandoned, backers receive a **trustless pro-rata refund** of all remaining unspent vault funds.

---

## 🏛️ Architecture & Security Invariants

### 1. Intelligent Contract (`contracts/ImpactVault.py`)
* **Multi-Tranche State Machine:** `FUNDING` ➔ `ACTIVE` ➔ `COMPLETED` (or `CANCELLED`).
* **Sequential Progression:** Milestone \(N+1\) can only be submitted after Milestone \(N\) is verified and approved.
* **Consensus Invariant:** 0% mismatch tolerance across AI validators evaluating criteria against deliverable summaries and HTTPS evidence links.
* **Mathematical Solvency & Pro-Rata Refund Invariant:**
  $$\text{Refund Amount} = \frac{(\text{Total Funded} - \text{Total Released}) \times \text{Backer Contribution}}{\text{Total Funded}}$$
* **Re-Entrancy & Access Protection:** Pull withdrawal pattern (`credits[who] = 0` before native transfer).

### 2. Live On-Chain Deployment (GenLayer StudioNet)
* **Contract Address:** [`0xbB5D0451189E360165908567e8B9EfA209D386E6`](https://explorer-studio.genlayer.com/address/0xbB5D0451189E360165908567e8B9EfA209D386E6)
* **Status:** `ACCEPTED` by StudioNet validators.

### 3. Production React DApp (`frontend/`)
* Built with **React 18 + Vite + genlayer-js**.
* **Obsidian Dark Web3 UI** with glassmorphism, glowing progress bars, and high contrast.
* Client-side **AES-GCM encrypted keystore** with burner key generation and testnet faucet integrations.
* Real-time campaign explorer, milestone roadmap breakdown, one-click consensus execution, and pull withdrawal management.

---

## 🧪 Testing

### 1. Direct Python Contract Tests
Run all 12 contract tests covering creation, funding, deliverable validation, AI approval/rejection, pull withdrawals, and pro-rata refunds:
```bash
pytest tests/direct/ -v
```

### 2. Frontend Unit Tests
Run frontend unit tests covering keystore encryption, formatting, and utilities:
```bash
cd frontend && npm test
```

---

## 🚀 Live Application

* **Live DApp:** [https://impact-vault.vercel.app](https://impact-vault.vercel.app)
* **GenLayer Explorer:** [0xbB5D0451189E360165908567e8B9EfA209D386E6](https://explorer-studio.genlayer.com/address/0xbB5D0451189E360165908567e8B9EfA209D386E6)
