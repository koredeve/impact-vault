# ImpactVault — Milestone-Gated DAO Grants & Crowdfunding Protocol

**ImpactVault** is a flagship decentralized grant and crowdfunding protocol built natively on **GenLayer**. Capital is locked in sequential milestone-gated vaults and trustlessly released in tranches only when AI validators verify that submitted deliverables satisfy immutable acceptance criteria.

---

## 🎯 The Problem ImpactVault Solves

In traditional Web3 grants (e.g. Gitcoin, DAO treasury programs) and crowdfunding platforms, recipients frequently collect 100% of upfront funds and abandon the project ("rug pull" or ghosting).

Traditional EVM smart contracts cannot evaluate natural language deliverables or verify whether real software was deployed. **ImpactVault leverages GenLayer's AI-powered Intelligent Contracts** to solve this:
1. Grants are split into sequential **milestones** with defined basis-point allocations (e.g. 30%, 35%, 35% = 100%).
2. Each milestone defines strict, immutable **Acceptance Criteria**.
3. Project creators submit verifiable work (deliverable summaries, GitHub commits, testnet deployments, audit reports).
4. **GenLayer AI Validators** independently inspect deliverables, fetch live web evidence, and achieve consensus on whether to unlock the next funding tranche.
5. If a project is cancelled or abandoned, backers receive a **trustless pro-rata refund** of all remaining unspent vault funds:
   $$\text{Refund Amount} = \frac{(\text{Total Funded} - \text{Total Released}) \times \text{Backer Contribution}}{\text{Total Funded}}$$

---

## 🏛️ Architecture & Protocol Features

### 1. Upgraded Intelligent Contract (`contracts/ImpactVault.py`)
* **Multi-Domain Categories:** `DeFi`, `AI / Agents`, `Infrastructure`, `Public Goods`, `Security & Audits`, `Developer Tooling`.
* **Live Web Evidence Fetching:** Validators use `gl.nondet.web.get(url)` to inspect live web evidence blocks during consensus evaluation.
* **On-Chain Creator Logs & Backer Endorsements:** Creators post verifiable sprint logs, and active backers post signal/feedback directly on-chain.
* **Platform Metrics Aggregator:** Real-time on-chain calculation of Total TVL, Total Disbursed, Active Grants, and Completed Projects.
* **Re-Entrancy & Access Protection:** Pull withdrawal pattern (`credits[who] = 0` before native transfer).

### 2. Live On-Chain Deployment (GenLayer StudioNet)
* **Contract Address:** [`0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5`](https://explorer-studio.genlayer.com/address/0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5)
* **Status:** `ACCEPTED` by StudioNet validators.

### 3. Production React DApp (`frontend/`)
* **Browser Wallet Integration (MetaMask / Rabby):** Seamless 1-click connection via injected `window.ethereum` provider (`makeExtensionClient`) with automatic EIP-3085 & EIP-3326 StudioNet network addition and switching (`0x1080` / `4224`). Every state-modifying contract write triggers a signed transaction prompt in your wallet.
* **Deep Vault Explorer:** Search by keyword/slug, filter by domain categories, and filter by lifecycle status.
* **Interactive Vault Detail Modal:** Milestone visual roadmap, deliverable proof links, AI consensus logs, on-chain updates, and backer ledger.
* **Step-by-Step Campaign Wizard:** 1-click criteria templates ("Open Source Code", "StudioNet Deployment", "Security Review") + Live BPS allocation calculator.
* **Built-in AI Criteria Architect:** Helps grant applicants formulate unambiguous, validator-verifiable criteria formulas.
* **Live Platform Stats Banner:** Real-time TVL, Total Disbursed, Active Vaults, and Completed Milestones.

---

## 🧪 Testing & Verification

### 1. Direct Python Contract Tests
Run all 13 contract tests covering creation, funding, deliverable validation, web scraping, AI approval/rejection, pull withdrawals, updates, and pro-rata refunds:
```bash
pytest tests/direct/ -v
```
**Result:** 13 / 13 passed (100% green).

### 2. Frontend Unit & Signed Write Tests
Run frontend test suite covering browser extension signing, automatic network switching, signed contract writes, keystore encryption, formatting, and templates:
```bash
cd frontend && npm test
```
**Result:** 11 / 11 passed (100% green).

---

## 🚀 Live Application

* **Live DApp:** [https://impact-vault-tau.vercel.app](https://impact-vault-tau.vercel.app)
* **GenLayer Explorer:** [`0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5`](https://explorer-studio.genlayer.com/address/0xaa0B08C948E1106fbfc8EfeADd75173fbee802d5)
