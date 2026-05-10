<p align="center">
  <img src="frontend/public/favicon.svg" width="56" height="56" alt="TrustLayer Logo" />
</p>

<h1 align="center">TrustLayer</h1>

<p align="center">
  <strong>Decentralized Identity & Reputation Infrastructure for Solana</strong>
</p>

<p align="center">
  <a href="https://solana.com"><img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=flat-square&logo=solana&logoColor=white" alt="Solana Devnet" /></a>
  <a href="https://www.anchor-lang.com"><img src="https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square" alt="Anchor" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-5.3-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://explorer.solana.com/address/4DNAXZBUwD8ejo6UEDzbq89faMjARWwV6DuWJMKHnyDm?cluster=devnet"><img src="https://img.shields.io/badge/Program-4DNAXZ...nyDm-14F195?style=flat-square" alt="Program ID" /></a>
</p>

---

## Overview

**TrustLayer** is a composable, on-chain identity and reputation protocol built on Solana. It enables any wallet to establish a verifiable trust profile — linking identity, contribution history, and reputation into a single portable primitive that DAOs, DeFi protocols, hiring platforms, and AI agents can query.

Unlike centralized reputation systems, TrustLayer stores every identity, work submission, and verification event as on-chain Program Derived Accounts (PDAs), making trust data fully transparent, permissionless, and composable.

### Core Thesis

> Reputation should be a portable, on-chain primitive — not a siloed score locked inside platforms.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **On-Chain Identity** | Each wallet mints a unique profile PDA storing username, trust score, and work count |
| **SNS Integration** | Resolves `.sol` domains via Bonfida SNS; falls back to `.tl` (TrustLayer native) identities |
| **Proof-of-Work Submissions** | Submit verifiable work records with proof links (GitHub PRs, IPFS hashes, Arweave URLs) |
| **Peer Verification** | Trusted reviewers verify or reject submissions, directly adjusting on-chain reputation |
| **Trust Score System** | Tiered reputation: Newcomer (0-19) → Rising (20-49) → Trusted (50-99) → Elite (100+) |
| **Ecosystem Composability** | Any protocol can query TrustLayer identities by username or wallet address |
| **Live Leaderboard** | Real-time ranking of all registered identities by trust score |
| **Frontend Trust Enforcement** | Self-verification prevention, rejection tracking, verifier metadata, username uniqueness |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)               │
│                                                         │
│  ConnectWallet ──► CreateProfile ──► Dashboard           │
│       │                                  │               │
│       ▼                                  ▼               │
│  SNS Lookup          SubmitWork ◄──► VerifyWork          │
│  (.sol / .tl)            │              │                │
│                          ▼              ▼                │
│                   WorkHistory    Leaderboard              │
│                                                         │
│                    EcosystemQuery                         │
│                    (search by username/wallet)            │
└───────────────────────────┬─────────────────────────────┘
                            │
                    Anchor RPC Calls
                            │
┌───────────────────────────▼─────────────────────────────┐
│              Solana Program (Anchor 0.30.1)              │
│              Program ID: 4DNAXZBUwD8ejo6U...            │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ UserProfile  │  │ WorkRecord  │  │  ReviewWork    │  │
│  │    PDA       │  │    PDA      │  │  (verify/      │  │
│  │             │  │             │  │   reject)      │  │
│  │ seeds:      │  │ seeds:      │  │               │  │
│  │ ["profile", │  │ ["work",    │  │  +10 rep      │  │
│  │  wallet]    │  │  profile,   │  │  -5 rep       │  │
│  │             │  │  job_id]    │  │               │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
│                                                         │
│  Events: ProfileCreated, WorkSubmitted, WorkReviewed    │
└─────────────────────────────────────────────────────────┘
                            │
                    Solana Devnet
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contract** | Rust + Anchor 0.30.1 |
| **Blockchain** | Solana (Devnet) |
| **Frontend** | React 18 + TypeScript + Vite 5 |
| **Styling** | Tailwind CSS 3.4 + Custom Design System |
| **Wallet** | Phantom (via `@solana/wallet-adapter`) |
| **Identity** | Bonfida SNS (`.sol` resolution) + TrustLayer native (`.tl`) |
| **Icons** | Lucide React |
| **Notifications** | react-hot-toast |
| **Routing** | React Router v6 |

---

## Smart Contract

### Program ID

```
4DNAXZBUwD8ejo6UEDzbq89faMjARWwV6DuWJMKHnyDm
```

[View on Solana Explorer →](https://explorer.solana.com/address/4DNAXZBUwD8ejo6UEDzbq89faMjARWwV6DuWJMKHnyDm?cluster=devnet)

### Instructions

| Instruction | Description | Reputation Effect |
|-------------|-------------|-------------------|
| `create_profile` | Initialize a new identity PDA | — |
| `submit_work` | Submit a work record with proof link | — |
| `verify_work` | Approve a submitted work record | **+10** |
| `reject_work` | Reject a submitted work record | **-5** |

### Account Structures

#### UserProfile PDA

```rust
seeds = ["profile", wallet.key()]
```

| Field | Type | Description |
|-------|------|-------------|
| `wallet` | `Pubkey` | Owner wallet address |
| `username` | `String` (max 50) | Identity handle (e.g. `alice.sol`, `pranjal.tl`) |
| `reputation_score` | `u32` | Cumulative trust score |
| `work_count` | `u32` | Total submitted work records |
| `bump` | `u8` | PDA bump seed |

#### WorkRecord PDA

```rust
seeds = ["work", profile.key(), job_id.as_bytes()]
```

| Field | Type | Description |
|-------|------|-------------|
| `profile` | `Pubkey` | Owning profile PDA |
| `job_id` | `String` (max 32) | Unique job identifier |
| `proof_link` | `String` (max 200) | URL to proof (GitHub, IPFS, Arweave) |
| `verified` | `bool` | Whether approved by a verifier |
| `bump` | `u8` | PDA bump seed |

### Events

| Event | Fields | Emitted When |
|-------|--------|-------------|
| `ProfileCreated` | `wallet`, `username` | New identity registered |
| `WorkSubmitted` | `profile`, `job_id` | Work proof submitted |
| `WorkReviewed` | `profile`, `job_id`, `accepted`, `new_reputation` | Work verified or rejected |

---

## Frontend Security Model

Since the deployed contract uses an open verifier model, TrustLayer implements a comprehensive **frontend trust enforcement layer**:

| Protection | Implementation |
|-----------|----------------|
| **Self-verification prevention** | Blocks users from verifying their own work (both auto-feed and manual form) |
| **Username uniqueness** | Real-time debounced check via `searchProfileByUsername()` before profile creation |
| **Rejection tracking** | `localStorage`-based tracking distinguishes Pending vs. Rejected work records |
| **Verifier metadata** | Records who verified/rejected each work record with timestamp |
| **Job ID byte validation** | Validates `TextEncoder.encode().length ≤ 32` to prevent PDA seed overflow |
| **Trust signal engine** | Dynamically computes "Why Trusted" signals from real on-chain data |

> **Note:** The trusted verifier whitelist in `trustConfig.ts` can be populated with specific wallet addresses to restrict verification access. When empty, it operates in open mode matching the current contract behavior.

---

## Project Structure

```
Sol_ID/
├── anchor/                          # Solana smart contract
│   ├── programs/
│   │   └── identity-reputation/
│   │       └── src/
│   │           └── lib.rs           # Contract logic (4 instructions, 2 PDAs, 3 events)
│   ├── Anchor.toml                  # Anchor configuration
│   ├── Cargo.toml                   # Rust workspace
│   └── Cargo.lock
│
├── frontend/                        # Production frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx     # Landing page with live protocol stats
│   │   │   └── layout/
│   │   │       ├── Layout.tsx        # Dashboard shell
│   │   │       └── Sidebar.tsx       # Navigation with inline trust score
│   │   ├── hooks/
│   │   │   ├── useProgram.ts         # Anchor program hook (profile, work, verify/reject)
│   │   │   └── useSnsLookup.ts       # SNS reverse lookup with demo override
│   │   ├── lib/
│   │   │   ├── idl.ts               # Program IDL + PROGRAM_ID constant
│   │   │   ├── program.ts           # Anchor instruction calls + account fetchers
│   │   │   └── trustConfig.ts       # Trust infrastructure (status, verifier, rejection tracking)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Trust Overview — stats, graph, trust signals, actions
│   │   │   ├── Profile.tsx           # Identity Passport — credentials, verifier metadata
│   │   │   ├── CreateProfile.tsx     # Profile creation with availability check
│   │   │   ├── SubmitWork.tsx        # Submit Proof — job ID + proof link
│   │   │   ├── VerifyWork.tsx        # Validate Contributions — pending feed + manual review
│   │   │   ├── WorkHistory.tsx       # Proof-of-Work — 3-state status badges
│   │   │   ├── Leaderboard.tsx       # Live on-chain ranking
│   │   │   └── EcosystemQuery.tsx    # Composability demo — search + API simulation
│   │   ├── App.tsx                   # Root — wallet providers, auth flow, routing
│   │   ├── main.tsx                  # Entry point
│   │   └── index.css                # Global styles + design system
│   ├── tailwind.config.js           # Design tokens + custom animations
│   ├── vite.config.ts               # Vite configuration with Node polyfills
│   ├── tsconfig.json
│   └── package.json
│
├── claude.md                        # Project context and session logs
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Phantom Wallet** browser extension ([phantom.app](https://phantom.app))
- Devnet SOL for transactions (use [Solana Faucet](https://faucet.solana.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/Pranjal-ctr/Sol_ID.git
cd Sol_ID

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:3002/**

### Configuration

The frontend connects to Solana Devnet by default. The program ID is hardcoded in `frontend/src/lib/idl.ts`:

```typescript
export const PROGRAM_ID = "4DNAXZBUwD8ejo6UEDzbq89faMjARWwV6DuWJMKHnyDm";
```

No `.env` file is required.

### Production Build

```bash
cd frontend
npm run build    # Outputs to frontend/dist/
npm run preview  # Preview production build locally
```

---

## Demo Flow

### 1. Connect Wallet
Open the app → Click "Select Wallet" → Connect Phantom (switch to Devnet in Phantom settings)

### 2. Create Identity
- If you own a `.sol` domain, it auto-resolves via SNS
- Otherwise, choose a `.tl` username (real-time availability check)
- One profile per wallet (enforced on-chain)

### 3. Submit Work
Navigate to "Submit Proof" → Enter a unique Job ID + proof link → Sign transaction

### 4. Verify Work
Switch to a **different wallet** → Navigate to "Validate" → Verify or reject pending submissions from the auto-loaded feed

### 5. View Results
- **Trust Overview** — See dynamic trust signals and reputation tier progression
- **Proof-of-Work** — View all submissions with Pending / Verified / Rejected badges
- **Identity Passport** — Full profile with trust credentials and verifier metadata
- **Leaderboard** — Compare rankings across all protocol participants

### SNS Demo Override
Append `?sns=<name>` to the URL to simulate SNS resolution:
```
http://localhost:3002/?sns=alice
```
This will resolve as `alice.sol` regardless of connected wallet.

---

## Trust Tier System

| Tier | Score Range | Description |
|------|------------|-------------|
| **Newcomer** | 0 – 19 | New identity, building initial trust |
| **Rising** | 20 – 49 | Active contributor with verified history |
| **Trusted** | 50 – 99 | Established reputation across the ecosystem |
| **Elite** | 100+ | Top-tier contributor with extensive verified work |

### Scoring
- **Verify work:** +10 reputation
- **Reject work:** -5 reputation
- Minimum score: 0 (cannot go negative)

---

## Ecosystem Composability

TrustLayer is designed as infrastructure that other protocols can query. The **Ecosystem Query** page demonstrates this with:

- **Username Search** — Look up any `.tl` or `.sol` identity
- **Wallet Search** — Query by wallet address
- **API Simulation** — Shows what a TrustLayer API response looks like
- **Use Cases** — DAO governance weighting, DeFi under-collateralized lending, merit-based grants, Sybil-resistant hackathon judging, AI agent trust

### Example Query Response

```json
{
  "identity": "pranjal.tl",
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "trustScore": 30,
  "tier": "Rising",
  "totalProofs": 3,
  "verifiedProofs": 3,
  "pendingProofs": 0,
  "successRate": "100%",
  "network": "devnet"
}
```

---

## Development

### Anchor Contract (if modifying)

```bash
cd anchor

# Build
anchor build

# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

> **Important:** Redeploying will generate a new Program ID. Update `declare_id!()` in `lib.rs`, `Anchor.toml`, and `frontend/src/lib/idl.ts` accordingly. Existing profiles/records will be lost.

### Frontend Development

```bash
cd frontend

npm run dev      # Start dev server (HMR enabled)
npm run build    # Production build
npm run preview  # Preview production build
```

### Key Files for Customization

| File | Purpose |
|------|---------|
| `frontend/src/lib/trustConfig.ts` | Trusted verifier whitelist, status system, trust signals |
| `frontend/src/lib/idl.ts` | Program IDL — regenerate after contract changes |
| `frontend/tailwind.config.js` | Design tokens, colors, animations |
| `frontend/src/index.css` | Global styles and component classes |

---

## Known Limitations

| Limitation | Context |
|-----------|---------|
| **Open verifier model** | The deployed contract allows any wallet to verify/reject. Trust enforcement is frontend-only. A production deployment would add `GlobalConfig` + `TrustedVerifier` PDAs. |
| **No on-chain rejection state** | The contract only stores `verified: bool`. Rejection tracking uses `localStorage`. A contract upgrade would add a `WorkStatus` enum. |
| **No username uniqueness on-chain** | Username uniqueness is checked via frontend search. A production upgrade would add a `UsernameRegistry` PDA. |
| **Devnet only** | Currently deployed on Solana Devnet. Mainnet deployment requires security audit and contract hardening. |

---

## Security Considerations

- No private keys, wallet keypairs, or secrets are stored in the repository
- The `.gitignore` excludes all sensitive patterns (`*.json` keypairs, `.env`, `anchor/target/`)
- No `process.env` or `import.meta.env` references exist in the codebase
- Program ID is consistent across all files (`lib.rs`, `Anchor.toml`, `idl.ts`)
- All console statements are limited to `console.warn`/`console.error` for error handling

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built on <a href="https://solana.com">Solana</a> · Powered by <a href="https://www.anchor-lang.com">Anchor</a> · Identity infrastructure for the decentralized web
</p>
