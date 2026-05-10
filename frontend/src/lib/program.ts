/**
 * program.ts — Anchor program integration layer.
 *
 * Single source of truth for all on-chain interaction.
 * Import instruction functions and PDA helpers from here.
 *
 * Uses Anchor 0.30.1 new-format IDL with discriminator-based deserialization.
 */

import { Program, AnchorProvider, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { IDL, PROGRAM_ID } from "./idl";

// ── Program ID ──
export const IDENTITY_PROGRAM_ID = new PublicKey(PROGRAM_ID);

// ── Provider + Program factory ──

export function getProvider(
  wallet: AnchorWallet,
  connection: Connection
): AnchorProvider {
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

export function getProgram(
  wallet: AnchorWallet,
  connection: Connection
): Program {
  const provider = getProvider(wallet, connection);
  return new Program(IDL as unknown as Idl, provider);
}

// ── PDA helpers ──

/** Derive UserProfile PDA: seeds = ["profile", walletPubkey] */
export function getProfilePda(walletPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), walletPublicKey.toBuffer()],
    IDENTITY_PROGRAM_ID
  );
}

/** Derive WorkRecord PDA: seeds = ["work", profilePda, jobId] */
export function getWorkPda(
  profilePda: PublicKey,
  jobId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("work"), profilePda.toBuffer(), Buffer.from(jobId)],
    IDENTITY_PROGRAM_ID
  );
}

// ── Instruction functions ──

export async function createProfile(
  wallet: AnchorWallet,
  connection: Connection,
  username: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(wallet.publicKey);

  return await (program.methods as any)
    .createProfile(username)
    .accounts({
      profile: profilePda,
      wallet: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function submitWork(
  wallet: AnchorWallet,
  connection: Connection,
  jobId: string,
  proofLink: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(wallet.publicKey);
  const [workPda] = getWorkPda(profilePda, jobId);

  return await (program.methods as any)
    .submitWork(jobId, proofLink)
    .accounts({
      profile: profilePda,
      workRecord: workPda,
      wallet: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function verifyWork(
  wallet: AnchorWallet,
  connection: Connection,
  profileOwnerKey: PublicKey,
  jobId: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(profileOwnerKey);
  const [workPda] = getWorkPda(profilePda, jobId);

  return await (program.methods as any)
    .verifyWork()
    .accounts({
      profile: profilePda,
      workRecord: workPda,
      verifier: wallet.publicKey,
    })
    .rpc();
}

export async function rejectWork(
  wallet: AnchorWallet,
  connection: Connection,
  profileOwnerKey: PublicKey,
  jobId: string
): Promise<string> {
  const program = getProgram(wallet, connection);
  const [profilePda] = getProfilePda(profileOwnerKey);
  const [workPda] = getWorkPda(profilePda, jobId);

  return await (program.methods as any)
    .rejectWork()
    .accounts({
      profile: profilePda,
      workRecord: workPda,
      verifier: wallet.publicKey,
    })
    .rpc();
}

// ── Account fetchers ──

export async function fetchProfile(
  wallet: AnchorWallet,
  connection: Connection,
  walletPublicKey: PublicKey
) {
  try {
    const program = getProgram(wallet, connection);
    const [profilePda] = getProfilePda(walletPublicKey);
    return await (program.account as any).userProfile.fetch(profilePda);
  } catch {
    return null;
  }
}

export async function fetchWorkRecords(
  wallet: AnchorWallet,
  connection: Connection,
  walletPublicKey: PublicKey
) {
  try {
    const program = getProgram(wallet, connection);
    const [profilePda] = getProfilePda(walletPublicKey);
    const allRecords = await (program.account as any).workRecord.all([
      {
        memcmp: {
          offset: 8,
          bytes: profilePda.toBase58(),
        },
      },
    ]);
    return allRecords.map((r: any) => r.account);
  } catch {
    return [];
  }
}

/**
 * Fetch ALL work records across the network (all profiles).
 * Returns raw account entries with pubkeys for PDA derivation.
 */
export async function fetchAllWorkRecords(
  wallet: AnchorWallet,
  connection: Connection
) {
  try {
    const program = getProgram(wallet, connection);
    const allRecords = await (program.account as any).workRecord.all();
    return allRecords as Array<{
      publicKey: PublicKey;
      account: {
        profile: PublicKey;
        jobId: string;
        proofLink: string;
        verified: boolean;
        bump: number;
      };
    }>;
  } catch {
    return [];
  }
}

/**
 * Fetch a UserProfile by its PDA address (not wallet address).
 * Used when we have the profile PDA from a WorkRecord.
 */
export async function fetchProfileByPda(
  wallet: AnchorWallet,
  connection: Connection,
  profilePda: PublicKey
) {
  try {
    const program = getProgram(wallet, connection);
    return await (program.account as any).userProfile.fetch(profilePda);
  } catch {
    return null;
  }
}

/**
 * Fetch ALL UserProfile accounts on the network.
 * Used for username search and leaderboard.
 */
export async function fetchAllProfiles(
  wallet: AnchorWallet,
  connection: Connection
) {
  try {
    const program = getProgram(wallet, connection);
    const allProfiles = await (program.account as any).userProfile.all();
    return allProfiles as Array<{
      publicKey: PublicKey;
      account: {
        wallet: PublicKey;
        username: string;
        reputationScore: number;
        workCount: number;
        bump: number;
      };
    }>;
  } catch {
    return [];
  }
}

/**
 * Search for a profile by username (e.g. "alice.sol", "pranjal.tl", or "pranjal").
 * Handles legacy profiles stored without a suffix.
 * Returns the profile data + wallet + work records, or null if not found.
 */
export async function searchProfileByUsername(
  wallet: AnchorWallet,
  connection: Connection,
  username: string
) {
  try {
    const allProfiles = await fetchAllProfiles(wallet, connection);
    const query = username.toLowerCase();

    // Extract bare name (strip .sol / .tl suffix if present)
    let bareName = query;
    if (query.endsWith(".sol")) bareName = query.slice(0, -4);
    else if (query.endsWith(".tl")) bareName = query.slice(0, -3);

    // Try matching against all possible stored formats:
    //   1. Exact match          (query = "pranjal.tl",  stored = "pranjal.tl")
    //   2. Bare name            (query = "pranjal.tl",  stored = "pranjal")
    //   3. Bare + .tl suffix    (query = "pranjal",     stored = "pranjal.tl")
    //   4. Bare + .sol suffix   (query = "pranjal",     stored = "pranjal.sol")
    const match = allProfiles.find((p) => {
      const stored = p.account.username.toLowerCase();
      return (
        stored === query ||
        stored === bareName ||
        stored === `${bareName}.tl` ||
        stored === `${bareName}.sol`
      );
    });

    if (!match) return null;

    // Fetch their work records
    const records = await fetchWorkRecords(wallet, connection, match.account.wallet);
    const verified = records.filter((r: any) => r.verified).length;

    return {
      profilePda: match.publicKey,
      wallet: match.account.wallet,
      username: match.account.username,
      reputationScore: match.account.reputationScore,
      workCount: match.account.workCount,
      verifiedWorks: verified,
      totalWorks: records.length,
      records,
    };
  } catch {
    return null;
  }
}

