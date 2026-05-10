# TrustLayer — Project Context

## Project Overview
**TrustLayer** is a decentralized identity and reputation protocol on Solana.
- Smart contract: Anchor program at `4DNAXZBUwD8ejo6UEDzbq89faMjARWwV6DuWJMKHnyDm`
- Frontend: Vite + React + TypeScript + Tailwind CSS
- Network: Solana Devnet

## Architecture
- **SNS Integration**: Reverse lookup via `@bonfida/spl-name-service` with `?sns=alice` demo override
- **Dual Identity**: `.sol` (SNS) or `.tl` (TrustLayer native) — stored in `username` field of UserProfile PDA
- **PDA Structure**:
  - UserProfile: seeds `["profile", wallet]`
  - WorkRecord: seeds `["work", profile_pda, job_id]` (job_id max 32 bytes)
- **Self-verification prevention**: Frontend filters own work from pending feed

## Key Files
| File | Purpose |
|------|---------|
| `src/App.tsx` | Root — wallet providers, auth flow (SNS → profile → routes) |
| `src/components/ConnectWallet.tsx` | Landing page |
| `src/components/layout/Layout.tsx` | Dashboard shell (sidebar + content) |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/pages/Dashboard.tsx` | Trust Overview (main dashboard) |
| `src/pages/Profile.tsx` | Identity Passport |
| `src/pages/SubmitWork.tsx` | Submit Proof page |
| `src/pages/VerifyWork.tsx` | Validate Contributions page |
| `src/pages/WorkHistory.tsx` | Proof-of-Work history |
| `src/pages/Leaderboard.tsx` | Live on-chain leaderboard |
| `src/pages/EcosystemQuery.tsx` | Composability demo — search by username/wallet |
| `src/pages/CreateProfile.tsx` | Profile creation (SNS or .tl fallback) |
| `src/hooks/useProgram.ts` | Anchor program hook — profile, work, verify/reject |
| `src/hooks/useSnsLookup.ts` | SNS reverse lookup with demo override |
| `src/lib/program.ts` | Anchor instruction calls + account fetchers |
| `src/lib/idl.ts` | Program IDL + PROGRAM_ID |
| `src/index.css` | Global styles + component classes |
| `tailwind.config.js` | Design tokens + animations |

## Design Decisions
- No emojis in UI — text-only tier badges
- Hybrid terminology: "Trust Score (Reputation)" not pure jargon
- Self-verification blocked on frontend (contract allows any signer)
- Leaderboard pulls live data via `fetchAllProfiles()`
- Ecosystem search handles legacy profiles (bare username without suffix)
- Error parsing surfaces: duplicate PDA, seed length, insufficient SOL

## Current Status (May 2025)
- All core features working: create profile, submit work, verify/reject, leaderboard, ecosystem query
- SNS integration complete with demo override
- **Production UI/UX upgrade COMPLETE** (all 9 phases executed)
  - Design system refined: desaturated palette, semantic trust colors, trust-card class
  - Terminology: Trust Score, Trust Overview, Submit Proof, Validate, Proof of Work, Identity Passport
  - Landing page: animated identity graph, problem cards, portable reputation section, protocol stats
  - Sidebar: inline trust score, left accent bar active state
  - Dashboard: Trust Passport, progression bar, trust graph preview, activity timeline, "Why Trusted" section
  - Profile: Verified By component, trust credentials, contributor metadata
  - Ecosystem: API simulation, SDK preview, 6 integration cards
  - Loading: cinematic step-by-step identity resolution sequence
  - Build: 0 errors, 1940 modules
- **Protocol hardening pass (Option A+) COMPLETE**:
  - NEW: `src/lib/trustConfig.ts` — central trust infrastructure (status enum, verifier whitelist, rejection tracking, verifier metadata, trust signal engine)
  - FIX: Self-verification blocked on BOTH pending feed AND manual review form
  - FIX: Rejection tracking via localStorage — rejected records now show as "Rejected" not "Pending"
  - FIX: Verifier metadata stored locally — shows who verified + when on WorkHistory and Profile
  - FIX: Username availability check is now REAL (debounced `searchProfileByUsername()`)
  - FIX: Job ID validates byte length (not char length) to prevent PDA seed overflow
  - FIX: Landing page protocol stats are now live on-chain data (read-only provider)
  - FIX: Mock "Verified By" section replaced with dynamic trust credentials from on-chain data
  - FIX: Dashboard "Why Trusted" section now computed from real work records
  - FIX: `text-s` typo → `text-sm` in EcosystemQuery
  - FIX: `section-label` restored to protocol-appropriate 12px size
  - Build: 0 errors, 1941 modules
- Dev server: `http://localhost:3002/`

## Security Model (Frontend Layer)
- **Self-verification**: Blocked in both pending feed (line filter) and manual form (ownerKey === myWallet check)
- **Rejection tracking**: localStorage key `trustlayer_rejected_records` — stores rejected work record composite keys
- **Verifier metadata**: localStorage key `trustlayer_verifier_meta` — stores verifier wallet + timestamp per review
- **Username uniqueness**: Checked via `searchProfileByUsername()` before profile creation (debounced 600ms)
- **Trusted verifiers**: Whitelist in `trustConfig.ts` (empty = open model matching current contract)
- **Contract limitation**: `verify_work` and `reject_work` have no on-chain access control — any signer can call. All trust enforcement is frontend-only.

## Terminology Map
| UI Term | On-Chain Field |
|---------|---------------|
| Trust Score | `reputationScore` (u32) |
| Identity | `username` (String, max 50) |
| Proof Record | WorkRecord PDA |
| Trust Tier | Derived: 0-19=Newcomer, 20-49=Rising, 50-99=Trusted, 100+=Elite |
| Work Status | Pending (default), Verified (on-chain), Rejected (localStorage) |
