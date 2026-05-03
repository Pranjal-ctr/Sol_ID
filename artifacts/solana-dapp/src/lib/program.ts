/**
 * program.ts — Anchor program integration layer.
 *
 * This module is the single source of truth for all on-chain interaction.
 * Import the four instruction functions and the PDA helpers from here;
 * never call Anchor or web3.js directly in components.
 *
 * How PDAs work in this program
 * ──────────────────────────────
 * A PDA (Program-Derived Address) is a deterministic account address
 * generated from seeds + the program ID. No private key exists for it —
 * only the program can sign for it. Two PDAs are used here:
 *
 *   UserProfile PDA:  seeds = [b"profile", walletPublicKey]
 *     → One unique address per wallet. Trying to `init` it twice fails,
 *       which is how the one-profile-per-wallet constraint is enforced.
 *
 *   WorkRecord PDA:   seeds = [b"work", profilePDA, jobId (as bytes)]
 *     → One unique address per (profile, jobId) pair. Submitting the same
 *       jobId twice for the same profile fails at the PDA level.
 */

import {
  Program,
  AnchorProvider,
  type Idl,
} from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { IDL, PROGRAM_ID, type IdentityReputationIDL } from "./idl";

// ── Program ID ────────────────────────────────────────────────────────────────
// Replace this after `anchor deploy` with the real address:
//   solana address -k anchor/target/deploy/identity_reputation-keypair.json
export const IDENTITY_PROGRAM_ID = new PublicKey(PROGRAM_ID);

// ── Provider + Program factory ────────────────────────────────────────────────

/**
 * Build an AnchorProvider from a connected wallet + a Connection.
 *
 * AnchorProvider wraps:
 *   - connection  → talks to the RPC node (Devnet here)
 *   - wallet      → signs transactions via Phantom
 *   - opts        → commitment level and pre-flight checks
 */
export function getProvider(
  wallet: AnchorWallet,
  connection: Connection
): AnchorProvider {
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

/**
 * Return a typed Program instance ready to call instructions.
 *
 * The IDL tells Anchor the shape of every instruction and account so it can
 * build and sign transactions automatically — you never touch raw bytes.
 */
export function getProgram(
  wallet: AnchorWallet,
  connection: Connection
): Program<IdentityReputationIDL> {
  const provider = getProvider(wallet, connection);
  return new Program(IDL as unknown as Idl, IDENTITY_PROGRAM_ID, provider) as unknown as Program<IdentityReputationIDL>;
}

// ── PDA derivation helpers ────────────────────────────────────────────────────

/**
 * Derive the UserProfile PDA for a given wallet.
 *
 * Seeds: ["profile", walletPublicKey]
 * The second return value (bump) is stored inside the account so the program
 * can re-derive the signer PDA without storing the full address.
 */
export function getProfilePda(walletPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), walletPublicKey.toBuffer()],
    IDENTITY_PROGRAM_ID
  );
}

/**
 * Derive the WorkRecord PDA for a given (profile, jobId) pair.
 *
 * Seeds: ["work", profilePDA, Buffer.from(jobId)]
 * Different job IDs produce different PDAs — submitting job-001 twice
 * for the same profile fails because the PDA already exists.
 */
export function getWorkPda(
  profilePda: PublicKey,
  jobId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("work"), profilePda.toBuffer(), Buffer.from(jobId)],
    IDENTITY_PROGRAM_ID
  );
}

// ── Instruction functions ─────────────────────────────────────────────────────

/**
 * createProfile(username)
 *
 * PDA flow:
 *   1. Derive profilePda from [b"profile", wallet].
 *   2. Pass it to the `profile` account field — Anchor sends the seeds in the
 *      transaction; the program calls `init` which creates and rents the account.
 *   3. The wallet pays for rent and signs the transaction.
 *
 * Fails if a profile PDA already exists for this wallet (one profile per wallet).
 */
export async function createProfile(
  wallet: AnchorWallet,
  connection: Connection,
  username: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(wallet.publicKey);

  const txSig = await program.methods
    .createProfile(username)
    .accounts({
      profile: profilePda,
      wallet: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return txSig;
}

/**
 * submitWork(job_id, proof_link)
 *
 * PDA flow:
 *   1. Derive profilePda  → identifies whose profile to update.
 *   2. Derive workPda from [b"work", profilePda, job_id] → unique record slot.
 *   3. The program inits workPda (creating the account) and increments
 *      profile.work_count.
 *
 * Fails if a WorkRecord for this jobId already exists on this profile.
 */
export async function submitWork(
  wallet: AnchorWallet,
  connection: Connection,
  jobId: string,
  proofLink: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(wallet.publicKey);
  const [workPda] = getWorkPda(profilePda, jobId);

  const txSig = await program.methods
    .submitWork(jobId, proofLink)
    .accounts({
      profile: profilePda,
      workRecord: workPda,
      wallet: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return txSig;
}

/**
 * verifyWork(job_id)
 *
 * PDA flow:
 *   1. Derive profilePda  → the account whose reputation_score is updated.
 *   2. Derive workPda     → the specific WorkRecord to mark verified = true.
 *   3. The program checks `has_one = profile` — ensures the WorkRecord really
 *      belongs to this profile (prevents cross-user attacks).
 *   4. reputation_score += 10 (saturating — cannot overflow u32).
 *
 * Note: In this demo the caller acts as verifier. In production, restrict
 * this to a known authority pubkey stored in a Config PDA.
 *
 * Fails with AlreadyVerified if the record was previously approved.
 */
export async function verifyWork(
  wallet: AnchorWallet,
  connection: Connection,
  profileOwnerKey: PublicKey,
  jobId: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(profileOwnerKey);
  const [workPda] = getWorkPda(profilePda, jobId);

  const txSig = await program.methods
    .verifyWork()
    .accounts({
      profile: profilePda,
      workRecord: workPda,
      verifier: wallet.publicKey,
    })
    .rpc();

  return txSig;
}

/**
 * rejectWork(job_id)
 *
 * PDA flow:
 *   1. Derive profilePda  → account whose reputation_score is penalised.
 *   2. Derive workPda     → the WorkRecord being rejected.
 *   3. reputation_score -= 5 (saturating_sub — floored at 0, never negative).
 *
 * Fails with AlreadyVerified if the record was previously approved — a
 * verified record is final and cannot be reversed.
 */
export async function rejectWork(
  wallet: AnchorWallet,
  connection: Connection,
  profileOwnerKey: PublicKey,
  jobId: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(profileOwnerKey);
  const [workPda] = getWorkPda(profilePda, jobId);

  const txSig = await program.methods
    .rejectWork()
    .accounts({
      profile: profilePda,
      workRecord: workPda,
      verifier: wallet.publicKey,
    })
    .rpc();

  return txSig;
}

// ── Account fetchers ──────────────────────────────────────────────────────────

/** Fetch a UserProfile account. Returns null if the account does not exist. */
export async function fetchProfile(
  wallet: AnchorWallet,
  connection: Connection,
  walletPublicKey: PublicKey
) {
  try {
    const program = getProgram(wallet, connection);
    const [profilePda] = getProfilePda(walletPublicKey);
    return await program.account.userProfile.fetch(profilePda);
  } catch {
    return null;
  }
}

/** Fetch all WorkRecord accounts owned by a profile. */
export async function fetchWorkRecords(
  wallet: AnchorWallet,
  connection: Connection,
  walletPublicKey: PublicKey
) {
  try {
    const program = getProgram(wallet, connection);
    const [profilePda] = getProfilePda(walletPublicKey);
    const allRecords = await program.account.workRecord.all([
      {
        memcmp: {
          offset: 8, // skip 8-byte discriminator
          bytes: profilePda.toBase58(),
        },
      },
    ]);
    return allRecords.map((r) => r.account);
  } catch {
    return [];
  }
}
