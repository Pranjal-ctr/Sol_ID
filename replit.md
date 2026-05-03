# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Solana dApp (`artifacts/solana-dapp`)

React 19 + Vite 7 + Tailwind v4 frontend for a decentralized identity and reputation system.

### Key files

| File | Purpose |
|---|---|
| `src/lib/idl.ts` | Full Anchor IDL — instructions, account schemas, events, errors. Update `PROGRAM_ID` after deploy. |
| `src/lib/program.ts` | Provider setup, PDA derivation helpers, 4 instruction functions, 2 account fetchers |
| `src/hooks/useProgram.ts` | React hook — wraps all on-chain calls with loading/error state |
| `src/pages/Home.tsx` | Full dashboard UI: connect wallet, create profile, submit work, verify/reject |

### PDA scheme

- `UserProfile`: seeds `["profile", walletPubkey]` — one per wallet
- `WorkRecord`: seeds `["work", profilePda, jobId]` — one per (profile, jobId)

### Program ID

Currently set to System Program (`11111111111111111111111111111111`) as a placeholder.
Replace in `src/lib/idl.ts` after running:
```
anchor build && anchor deploy
solana address -k anchor/target/deploy/identity_reputation-keypair.json
```

### Dependencies

- `@coral-xyz/anchor` ^0.30.1 — program client
- `@solana/web3.js` ^1.98.4 — RPC + keypair primitives
- `@solana/wallet-adapter-react` + `-react-ui` + `-wallets` — Phantom integration
- `vite-plugin-node-polyfills` — fixes Vite 7 Buffer externalization

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
