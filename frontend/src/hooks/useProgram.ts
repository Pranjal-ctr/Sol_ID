/**
 * useProgram — React hook that wires Anchor to the connected wallet.
 *
 * Flow:
 *   1. Wallet connects → useEffect fires → refresh() fetches UserProfile PDA
 *   2. If PDA exists  → profile state populated  → UI shows dashboard
 *   3. If PDA missing → profile stays null        → UI shows CreateProfile
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

// ── Types ──

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

// ── Hook ──

export function useProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (wallet) {
      refresh();
    } else {
      setProfile(null);
      setWorkRecords([]);
      setLoading(false);
    }
  }, [wallet, refresh]);

  // ── Instruction wrappers ──

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

// ── Helpers ──

function parseAnchorError(e: unknown): string {
  if (e instanceof Error) {
    const msg = e.message;
    // Anchor-level error messages
    const match = msg.match(/Error Message: (.+?)(\.|$)/);
    if (match) return match[1];
    // Account already exists (duplicate PDA — e.g. same job_id submitted twice)
    if (msg.includes("already in use") || msg.includes("already been processed"))
      return "This record already exists. If submitting work, use a unique Job ID.";
    // Seed length
    if (msg.includes("max seed length"))
      return "Input too long for PDA seed (max 32 bytes). Use a shorter value.";
    // Insufficient funds
    if (msg.includes("insufficient") || msg.includes("0x1"))
      return "Insufficient SOL balance. Request an airdrop on Devnet.";
    // Custom program error
    if (msg.includes("custom program error"))
      return "Program error — check that the program is deployed and the program ID is correct.";
    // Transaction simulation failure
    if (msg.includes("Transaction simulation failed"))
      return msg.split("Transaction simulation failed:")[1]?.trim() ?? msg;
    return msg;
  }
  return "Unknown error";
}
