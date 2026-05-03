# SolID — Solana Identity & Reputation dApp

SolID is a hackathon-ready Solana dApp that turns wallet ownership into a persistent on-chain identity. Users connect with Phantom, claim a username, build reputation through submitted work, and get a clean identity-based experience instead of a wallet-address-only UI.

## Problem Statement

Web3 apps often reduce users to wallet addresses, which creates a poor UX for identity, trust, and reputation. Builders need a way to:

- create readable identities tied to wallets
- track reputation on-chain
- review work with transparent verification
- present a polished demo that judges can immediately understand

## Solution

SolID solves this by using Solana Anchor program-derived accounts (PDAs) to store a wallet-bound profile and work records. The app automatically checks whether a profile exists after wallet connect:

- profile exists → dashboard loads
- profile missing → user is prompted to create one

This creates an identity-first flow with usernames, reputation badges, work submission, and reviewer actions all backed by on-chain state.

## Architecture

### Frontend
- React + Vite
- Phantom wallet adapter
- Anchor client integration
- Dark futuristic UI with loading states, badges, and notifications

### On-chain program
- `UserProfile` PDA stores username, reputation score, and work count
- `WorkRecord` PDA stores submitted work metadata and verification state
- instructions include profile creation, work submission, verification, and rejection

### Data flow
1. Wallet connects
2. App checks for `UserProfile` PDA at `['profile', wallet]`
3. If found, dashboard + work tools render
4. If not found, create-profile screen renders
5. Submitted work creates `WorkRecord` PDAs
6. Reviewer actions update status and reputation

## Features

- Phantom wallet login
- Identity-based onboarding
- On-chain username profile
- Reputation tracking
- Reputation badges:
  - `> 50` → Trusted Freelancer
  - `> 100` → Elite Contributor
- Work submission and review flow
- Success/error notifications
- Loading and identity verification states
- Dark futuristic hackathon UI
- Username-first display across the app

## How the Identity Layer Works

The identity layer is powered by a `UserProfile` PDA derived from:

```ts
['profile', wallet]
```

When a wallet connects, the app checks whether the PDA exists.

- **If it exists**: the wallet is treated as a known identity and the dashboard loads.
- **If it does not exist**: the user must create a profile first.

This makes the wallet the root of identity, while the username becomes the human-readable label for that identity. Reputation and work history are stored on-chain and updated by program instructions, so the identity layer remains persistent and verifiable.

## Future Scope

- richer reviewer roles and permissions
- profile avatars and bios stored on-chain or via decentralized metadata
- follower / endorsement system
- decentralized attestations and badges
- leaderboard and discovery feeds
- multi-project reputation aggregation
- mobile-friendly companion experience
- production mainnet deployment and indexer support

## Run

```bash
pnpm --filter @workspace/solana-dapp run dev
```

## Build

```bash
pnpm --filter @workspace/solana-dapp run build
```

## Hackathon Summary

SolID transforms a wallet into a readable on-chain identity with reputation, work history, and trust signals — making Solana apps feel more human, more understandable, and much more demo-ready.
