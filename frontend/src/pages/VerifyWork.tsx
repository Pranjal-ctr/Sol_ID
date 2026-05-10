/**
 * VerifyWork — Review submitted work records.
 *
 * Two modes:
 *   1. Pending Work Feed — auto-fetches ALL unverified work across the network.
 *      One-click verify/reject. No wallet address needed.
 *   2. Manual Review — collapsible fallback for specific wallet + job_id lookup.
 *
 * Trust enforcement (frontend layer):
 *   - Self-verification blocked on both feed and manual form
 *   - Rejection tracked via localStorage (contract doesn't distinguish pending/rejected)
 *   - Verifier metadata stored locally for display
 */

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import {
  fetchAllWorkRecords,
  fetchProfileByPda,
  getProfilePda,
} from "@/lib/program";
import {
  markAsRejected,
  storeVerifierMeta,
  isRejected,
} from "@/lib/trustConfig";
import toast from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Hash,
  User,
  RefreshCw,
  ChevronDown,
  Globe,
  Shield,
  Link as LinkIcon,
  Inbox,
} from "lucide-react";

/** Parse identity to extract name, suffix, and source. */
function parseIdentity(username: string) {
  if (username.endsWith(".sol")) {
    return { name: username.slice(0, -4), suffix: ".sol", isSns: true };
  }
  if (username.endsWith(".tl")) {
    return { name: username.slice(0, -3), suffix: ".tl", isSns: false };
  }
  return { name: username, suffix: ".tl", isSns: false };
}

// ── Types for the pending feed ──

type PendingWorkItem = {
  profilePda: PublicKey;
  ownerWallet: PublicKey;
  ownerUsername: string;
  jobId: string;
  proofLink: string;
};

export default function VerifyWork() {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { callVerifyWork, callRejectWork, refresh: refreshProfile } = useProgram();

  // Connected wallet address for self-verification guard
  const myWallet = anchorWallet?.publicKey?.toBase58() ?? "";

  // ── Pending feed state ──
  const [pendingWork, setPendingWork] = useState<PendingWorkItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [actioningJobId, setActioningJobId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"verify" | "reject" | null>(null);

  // ── Manual review state ──
  const [showManual, setShowManual] = useState(false);
  const [jobId, setJobId] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [manualPhase, setManualPhase] = useState<"idle" | "verifying" | "rejecting" | "done">("idle");
  const [lastAction, setLastAction] = useState<"verify" | "reject" | null>(null);
  const [sig, setSig] = useState("");

  // ── Fetch pending work feed ──
  const loadPendingFeed = useCallback(async () => {
    if (!anchorWallet) return;
    setFeedLoading(true);
    setFeedError(null);

    try {
      // 1. Fetch ALL work records
      const allRecords = await fetchAllWorkRecords(anchorWallet, connection);

      // 2. Filter to pending only (not verified AND not rejected)
      const unverified = allRecords.filter(
        (r) =>
          !r.account.verified &&
          !isRejected(r.account.profile.toBase58(), r.account.jobId)
      );

      if (unverified.length === 0) {
        setPendingWork([]);
        setFeedLoading(false);
        return;
      }

      // 3. Get unique profile PDAs and fetch their profiles
      const uniqueProfiles = new Map<string, PublicKey>();
      for (const r of unverified) {
        const key = r.account.profile.toBase58();
        if (!uniqueProfiles.has(key)) {
          uniqueProfiles.set(key, r.account.profile);
        }
      }

      const profileCache = new Map<string, { wallet: PublicKey; username: string }>();
      await Promise.all(
        Array.from(uniqueProfiles.entries()).map(async ([key, pda]) => {
          const profile = await fetchProfileByPda(anchorWallet, connection, pda);
          if (profile) {
            profileCache.set(key, {
              wallet: profile.wallet,
              username: profile.username,
            });
          }
        })
      );

      // 4. Build the feed — exclude own work (self-verification prevention)
      const feed: PendingWorkItem[] = [];
      for (const r of unverified) {
        const profileKey = r.account.profile.toBase58();
        const profileInfo = profileCache.get(profileKey);
        if (profileInfo) {
          // Skip own work — users cannot verify their own submissions
          if (profileInfo.wallet.toBase58() === myWallet) continue;

          feed.push({
            profilePda: r.account.profile,
            ownerWallet: profileInfo.wallet,
            ownerUsername: profileInfo.username,
            jobId: r.account.jobId,
            proofLink: r.account.proofLink,
          });
        }
      }

      setPendingWork(feed);
    } catch (err) {
      console.error("[VerifyWork] Feed load error:", err);
      setFeedError("Failed to load pending work records. Try refreshing.");
    } finally {
      setFeedLoading(false);
    }
  }, [anchorWallet, connection]);

  useEffect(() => {
    loadPendingFeed();
  }, [loadPendingFeed]);

  // ── Feed action handlers ──

  async function handleFeedVerify(item: PendingWorkItem) {
    setActioningJobId(item.jobId);
    setActionType("verify");
    const r = await callVerifyWork(item.ownerWallet, item.jobId);
    if (r.status === "success") {
      // Store verifier metadata
      storeVerifierMeta(item.profilePda.toBase58(), item.jobId, {
        verifierWallet: myWallet,
        timestamp: Date.now(),
      });
      toast.success(`Verified "${item.jobId}" — +10 reputation`);
      await refreshProfile();
      // Remove from local feed
      setPendingWork((prev) =>
        prev.filter((w) => !(w.jobId === item.jobId && w.ownerWallet.equals(item.ownerWallet)))
      );
    } else {
      toast.error(r.error ?? "Transaction failed");
    }
    setActioningJobId(null);
    setActionType(null);
  }

  async function handleFeedReject(item: PendingWorkItem) {
    setActioningJobId(item.jobId);
    setActionType("reject");
    const r = await callRejectWork(item.ownerWallet, item.jobId);
    if (r.status === "success") {
      // Track rejection locally (contract doesn't distinguish pending/rejected)
      markAsRejected(item.profilePda.toBase58(), item.jobId);
      storeVerifierMeta(item.profilePda.toBase58(), item.jobId, {
        verifierWallet: myWallet,
        timestamp: Date.now(),
      });
      toast.success(`Rejected "${item.jobId}" — −5 reputation`);
      await refreshProfile();
      setPendingWork((prev) =>
        prev.filter((w) => !(w.jobId === item.jobId && w.ownerWallet.equals(item.ownerWallet)))
      );
    } else {
      toast.error(r.error ?? "Transaction failed");
    }
    setActioningJobId(null);
    setActionType(null);
  }

  // ── Manual review handlers ──

  const manualBusy = manualPhase === "verifying" || manualPhase === "rejecting";
  const isSelfReview = ownerKey.trim() === myWallet && ownerKey.trim().length > 0;
  const canManualAct = jobId.trim().length > 0 && ownerKey.trim().length > 0 && !manualBusy && !isSelfReview;

  function validateKey(key: string): PublicKey | null {
    try { return new PublicKey(key); } catch { return null; }
  }

  function resetManualStatus() {
    if (manualPhase === "done") setManualPhase("idle");
  }

  async function handleManualVerify() {
    if (!canManualAct) return;
    const pk = validateKey(ownerKey.trim());
    if (!pk) { toast.error("Invalid wallet address"); return; }
    setManualPhase("verifying");
    const r = await callVerifyWork(pk, jobId.trim());
    if (r.status === "success") {
      const [profilePda] = getProfilePda(pk);
      storeVerifierMeta(profilePda.toBase58(), jobId.trim(), {
        verifierWallet: myWallet,
        timestamp: Date.now(),
      });
      setLastAction("verify");
      setSig(r.sig ?? "");
      setManualPhase("done");
      toast.success("Work verified — +10 reputation");
      await refreshProfile();
      await loadPendingFeed();
    } else {
      toast.error(r.error ?? "Transaction failed");
      setManualPhase("idle");
    }
  }

  async function handleManualReject() {
    if (!canManualAct) return;
    const pk = validateKey(ownerKey.trim());
    if (!pk) { toast.error("Invalid wallet address"); return; }
    setManualPhase("rejecting");
    const r = await callRejectWork(pk, jobId.trim());
    if (r.status === "success") {
      const [profilePda] = getProfilePda(pk);
      markAsRejected(profilePda.toBase58(), jobId.trim());
      storeVerifierMeta(profilePda.toBase58(), jobId.trim(), {
        verifierWallet: myWallet,
        timestamp: Date.now(),
      });
      setLastAction("reject");
      setSig(r.sig ?? "");
      setManualPhase("done");
      toast.success("Work rejected. −5 reputation");
      await refreshProfile();
      await loadPendingFeed();
    } else {
      toast.error(r.error ?? "Transaction failed");
      setManualPhase("idle");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Validate Contributions</h1>
          <p className="text-sm text-white/30 mt-0.5">
            Review and verify submitted proof records
          </p>
        </div>
        <button
          onClick={loadPendingFeed}
          disabled={feedLoading}
          className="btn-secondary flex items-center gap-2 text-sm !px-4 !py-2"
        >
          <RefreshCw className={`w-4 h-4 ${feedLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Reputation legend */}
      <div className="flex gap-4">
        <div className="glass-card p-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-400">Verify</p>
            <p className="text-xs text-white/30">+10 reputation</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">Reject</p>
            <p className="text-xs text-white/30">−5 reputation (min 0)</p>
          </div>
        </div>
      </div>

      {/* Self-verification protection notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
        <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-400">Trust Protection</p>
          <p className="text-xs text-white/35 mt-0.5">You cannot verify or reject your own work. Only work submitted by other users appears in the feed below. This prevents spam wallets from self-boosting reputation.</p>
        </div>
      </div>

      {/* ═════════ PENDING WORK FEED ═════════ */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white/80">
              Pending Contributions
            </h2>
            <p className="text-xs text-white/30">
              Unverified proof records across the network
            </p>
          </div>
        </div>

        {feedLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
              <p className="text-sm text-white/40">Loading pending work...</p>
            </div>
          </div>
        ) : feedError ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{feedError}</p>
          </div>
        ) : pendingWork.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white/50 mb-1">
              All caught up!
            </h3>
            <p className="text-sm text-white/30">
              No pending work records to review. Submit work first, then come
              back to verify.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingWork.map((item) => {
              const identity = parseIdentity(item.ownerUsername);
              const isActioning =
                actioningJobId === item.jobId &&
                item.ownerWallet.toBase58() ===
                  pendingWork.find((w) => w.jobId === actioningJobId)?.ownerWallet.toBase58();
              const isVerifying = isActioning && actionType === "verify";
              const isRejecting = isActioning && actionType === "reject";

              return (
                <div
                  key={`${item.ownerWallet.toBase58()}-${item.jobId}`}
                  className="rounded-xl border border-white/[0.06] bg-surface-200/30 p-4 hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Submitter info */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-brand-500/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {identity.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Identity + job */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">
                          {identity.name}
                          <span
                            className={
                              identity.isSns
                                ? "text-emerald-400"
                                : "text-brand-400"
                            }
                          >
                            {identity.suffix}
                          </span>
                        </span>
                        {identity.isSns ? (
                          <Globe className="w-3 h-3 text-emerald-400/50" />
                        ) : (
                          <Shield className="w-3 h-3 text-brand-400/50" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-3 h-3 text-white/20" />
                        <span className="text-sm text-white/70 font-medium">
                          {item.jobId}
                        </span>
                      </div>

                      {/* Proof link */}
                      <a
                        href={item.proofLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-400/70 hover:text-brand-400 transition-colors truncate max-w-md"
                      >
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        {item.proofLink}
                      </a>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleFeedVerify(item)}
                        disabled={!!actioningJobId}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {isVerifying ? "..." : "Verify"}
                      </button>
                      <button
                        onClick={() => handleFeedReject(item)}
                        disabled={!!actioningJobId}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 bg-red-500/[0.06] border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isRejecting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {isRejecting ? "..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═════════ MANUAL REVIEW (collapsible) ═════════ */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-200/60 flex items-center justify-center">
              <Hash className="w-4 h-4 text-white/40" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white/70">
                Manual Review
              </h3>
              <p className="text-xs text-white/30">
                Verify by wallet address + job ID
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-white/30 transition-transform duration-200 ${
              showManual ? "rotate-180" : ""
            }`}
          />
        </button>

        {showManual && (
          <div className="px-5 pb-5 border-t border-white/[0.04] pt-5">
            <div className="space-y-5 max-w-xl">
              <div>
                <label
                  htmlFor="rw-owner"
                  className="flex items-center justify-between text-sm font-semibold text-white/70 mb-2"
                >
                  <span>Profile Owner Wallet</span>
                  {anchorWallet?.publicKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerKey(anchorWallet.publicKey.toBase58());
                        resetManualStatus();
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
                    >
                      Use mine
                    </button>
                  )}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    id="rw-owner"
                    type="text"
                    placeholder="Wallet pubkey of the profile to review"
                    value={ownerKey}
                    disabled={manualBusy}
                    onChange={(e) => {
                      setOwnerKey(e.target.value);
                      resetManualStatus();
                    }}
                    className="input-field pl-10 font-mono text-xs"
                  />
                </div>
                {isSelfReview && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <Shield className="w-3 h-3 text-red-400" />
                    <p className="text-xs text-red-400 font-medium">You cannot verify your own work</p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="rw-job-id"
                  className="block text-sm font-semibold text-white/70 mb-2"
                >
                  Job ID
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    id="rw-job-id"
                    type="text"
                    placeholder="job-2024-001"
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                    value={jobId}
                    disabled={manualBusy}
                    onChange={(e) => {
                      setJobId(e.target.value);
                      resetManualStatus();
                    }}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={!canManualAct}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 border border-emerald-500/30 transition-all duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {manualPhase === "verifying" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {manualPhase === "verifying" ? "Verifying…" : "Verify Work"}
                  <span className="text-emerald-200/60 text-xs ml-1">+10</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualReject}
                  disabled={!canManualAct}
                  className="flex-1 btn-danger flex items-center justify-center gap-2"
                >
                  {manualPhase === "rejecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {manualPhase === "rejecting" ? "Rejecting…" : "Reject Work"}
                  <span className="text-red-200/60 text-xs ml-1">−5</span>
                </button>
              </div>

              {manualPhase === "done" && lastAction && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl animate-slide-up ${
                    lastAction === "verify"
                      ? "bg-emerald-500/[0.06] border border-emerald-500/20"
                      : "bg-red-500/[0.06] border border-red-500/20"
                  }`}
                >
                  <span
                    className={`text-lg ${
                      lastAction === "verify"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {lastAction === "verify" ? "✓" : "✕"}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        lastAction === "verify"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {lastAction === "verify"
                        ? "Work verified — +10 reputation"
                        : "Work rejected — −5 reputation"}
                    </p>
                    {sig && (
                      <a
                        href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Explorer
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-surface/40 border border-white/[0.04] flex items-start gap-2">
              <span className="text-white/20 text-xs mt-0.5">ℹ</span>
              <span className="text-xs text-white/30">
                Already-verified records cannot be re-reviewed — the program
                returns{" "}
                <code className="text-brand-400/60 font-mono">
                  AlreadyVerified
                </code>{" "}
                (error 6003).
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live data note */}
      <div className="flex items-center gap-2 text-xs text-white/25 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)] animate-pulse" />
        Querying all WorkRecord PDAs from Solana Devnet
      </div>
    </div>
  );
}
