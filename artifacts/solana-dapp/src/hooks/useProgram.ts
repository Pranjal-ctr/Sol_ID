/**
 * useProgram — React hook that wires Anchor to the connected wallet.
 *
 * Returns ready-to-call async functions for every on-chain instruction plus
 * helpers to fetch profile and work record data.
 *
 * Usage:
 *   const { profile, workRecords, loading, callCreateProfile, ... } = useProgram();
 */

import { useCallback, useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  createProfile,
  submitWork,
  verifyWork,
  rejectWork,
  fetchProfile,
  fetchWorkRecords,
} from "@/lib/program";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkRecord = {
  profile: PublicKey;
  jobId: string;
  proofLink: string;
  verified: boolean;
  bump: number;
};

export type UserProfile = {
  wallet: PublicKey;
  username: string;
  reputationScore: number;
  workCount: number;
  bump: number;
};

export type TxStatus = "idle" | "pending" | "success" | "error";

type TxResult = { status: TxStatus; sig?: string; error?: string };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [workRecords, setWorkRecords]  = useState<WorkRecord[]>([]);
  const [loading, setLoading]          = useState(false);

  // ── Refresh: load profile + work records from chain ──────────────────────
  const refresh = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        fetchProfile(wallet, connection, wallet.publicKey),
        fetchWorkRecords(wallet, connection, wallet.publicKey),
      ]);
      setProfile(p as UserProfile | null);
      setWorkRecords(w as WorkRecord[]);
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  // Fetch on wallet connect / disconnect
  useEffect(() => {
    if (wallet) {
      refresh();
    } else {
      setProfile(null);
      setWorkRecords([]);
    }
  }, [wallet, refresh]);

  // ── Instruction wrappers ──────────────────────────────────────────────────

  /**
   * callCreateProfile — calls create_profile on-chain.
   *
   * PDA created: [b"profile", walletPublicKey]
   * After success, refreshes local state so the UI shows the new profile.
   */
  const callCreateProfile = useCallback(
    async (username: string): Promise<TxResult> => {
      if (!wallet) return { status: "error", error: "Wallet not connected" };
      try {
        const sig = await createProfile(wallet, connection, username);
        await refresh();
        return { status: "success", sig };
      } catch (e: unknown) {
        return { status: "error", error: parseAnchorError(e) };
      }
    },
    [wallet, connection, refresh]
  );

  /**
   * callSubmitWork — calls submit_work on-chain.
   *
   * PDAs involved:
   *   - profilePda [b"profile", wallet] — work_count incremented
   *   - workPda    [b"work", profilePda, jobId] — created by this ix
   */
  const callSubmitWork = useCallback(
    async (jobId: string, proofLink: string): Promise<TxResult> => {
      if (!wallet) return { status: "error", error: "Wallet not connected" };
      try {
        const sig = await submitWork(wallet, connection, jobId, proofLink);
        await refresh();
        return { status: "success", sig };
      } catch (e: unknown) {
        return { status: "error", error: parseAnchorError(e) };
      }
    },
    [wallet, connection, refresh]
  );

  /**
   * callVerifyWork — calls verify_work on-chain.
   *
   * PDAs involved:
   *   - profilePda  — reputation_score += 10
   *   - workPda     — verified set to true
   * The caller acts as the verifier signer in this demo.
   */
  const callVerifyWork = useCallback(
    async (profileOwnerKey: PublicKey, jobId: string): Promise<TxResult> => {
      if (!wallet) return { status: "error", error: "Wallet not connected" };
      try {
        const sig = await verifyWork(wallet, connection, profileOwnerKey, jobId);
        await refresh();
        return { status: "success", sig };
      } catch (e: unknown) {
        return { status: "error", error: parseAnchorError(e) };
      }
    },
    [wallet, connection, refresh]
  );

  /**
   * callRejectWork — calls reject_work on-chain.
   *
   * PDAs involved:
   *   - profilePda  — reputation_score -= 5 (floored at 0)
   *   - workPda     — NOT marked verified (stays false)
   * The caller acts as the verifier signer in this demo.
   */
  const callRejectWork = useCallback(
    async (profileOwnerKey: PublicKey, jobId: string): Promise<TxResult> => {
      if (!wallet) return { status: "error", error: "Wallet not connected" };
      try {
        const sig = await rejectWork(wallet, connection, profileOwnerKey, jobId);
        await refresh();
        return { status: "success", sig };
      } catch (e: unknown) {
        return { status: "error", error: parseAnchorError(e) };
      }
    },
    [wallet, connection, refresh]
  );

  return {
    wallet,
    profile,
    workRecords,
    loading,
    refresh,
    callCreateProfile,
    callSubmitWork,
    callVerifyWork,
    callRejectWork,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a readable message from Anchor errors or plain Error objects. */
function parseAnchorError(e: unknown): string {
  if (e instanceof Error) {
    // Anchor wraps program errors: look for the custom message
    const match = e.message.match(/Error Message: (.+?)(\.|$)/);
    if (match) return match[1];
    // Simulation / RPC error
    if (e.message.includes("custom program error")) {
      return "Program error — check that the program is deployed and the program ID is correct.";
    }
    return e.message;
  }
  return "Unknown error";
}
