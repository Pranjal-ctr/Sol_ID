/**
 * trustConfig.ts — Protocol trust configuration.
 *
 * Since the deployed contract (4DNAXZ...) has an open verifier model,
 * trust enforcement is handled at the frontend layer.
 *
 * This file defines:
 *   - Trusted verifier whitelist
 *   - Work status enum (Pending/Verified/Rejected)
 *   - Rejection tracking via localStorage
 *   - Trust signal computation helpers
 */

// ── Work Status ──

export enum WorkStatus {
  Pending = 0,
  Verified = 1,
  Rejected = 2,
}

export function getStatusLabel(status: WorkStatus): string {
  switch (status) {
    case WorkStatus.Verified: return "Verified";
    case WorkStatus.Rejected: return "Rejected";
    default: return "Pending";
  }
}

export function getStatusColor(status: WorkStatus): {
  text: string;
  bg: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case WorkStatus.Verified:
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        dot: "bg-emerald-400",
      };
    case WorkStatus.Rejected:
      return {
        text: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        dot: "bg-red-400",
      };
    default:
      return {
        text: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        dot: "bg-amber-400",
      };
  }
}

// ── Trusted Verifier Registry ──
//
// In production, this would be fetched from a GlobalConfig PDA on-chain.
// For the current deployment, we maintain a frontend whitelist.
//
// Add your demo verifier wallet(s) here:

const TRUSTED_VERIFIERS: Set<string> = new Set([
  // Add trusted verifier wallet addresses here.
  // Any wallet in this set will be displayed with "Trusted Verifier" badge.
  // Leave empty to allow any wallet to verify (current contract behavior)
  // but still enforce self-verification protection.
]);

/**
 * Check if a wallet is a trusted verifier.
 * If the whitelist is empty, all wallets are treated as trusted
 * (matches the current open contract model).
 */
export function isTrustedVerifier(walletAddress: string): boolean {
  if (TRUSTED_VERIFIERS.size === 0) return true;
  return TRUSTED_VERIFIERS.has(walletAddress);
}

/**
 * Get count of registered trusted verifiers.
 * Returns 0 if whitelist is empty (open model).
 */
export function getTrustedVerifierCount(): number {
  return TRUSTED_VERIFIERS.size;
}

// ── Rejection Tracking ──
//
// The deployed contract doesn't distinguish "pending" from "rejected"
// (both have verified=false). We track rejections client-side via
// localStorage so the UI can show proper status.

const REJECTION_STORAGE_KEY = "trustlayer_rejected_records";

/** Get all rejected work record keys. */
function getRejectedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(REJECTION_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/** Mark a work record as rejected (by its composite key). */
export function markAsRejected(profilePda: string, jobId: string): void {
  const key = `${profilePda}:${jobId}`;
  const set = getRejectedSet();
  set.add(key);
  try {
    localStorage.setItem(REJECTION_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/** Check if a work record has been rejected. */
export function isRejected(profilePda: string, jobId: string): boolean {
  const key = `${profilePda}:${jobId}`;
  return getRejectedSet().has(key);
}

/**
 * Determine the effective work status combining on-chain + local tracking.
 */
export function resolveWorkStatus(
  verified: boolean,
  profilePda: string,
  jobId: string
): WorkStatus {
  if (verified) return WorkStatus.Verified;
  if (isRejected(profilePda, jobId)) return WorkStatus.Rejected;
  return WorkStatus.Pending;
}

// ── Verifier Metadata Tracking ──
//
// Since the contract doesn't store who verified a record,
// we track it locally when verification happens through the UI.

const VERIFIER_META_KEY = "trustlayer_verifier_meta";

export type VerifierMeta = {
  verifierWallet: string;
  verifierUsername?: string;
  timestamp: number;
};

function getVerifierMetaMap(): Record<string, VerifierMeta> {
  try {
    const raw = localStorage.getItem(VERIFIER_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Store verifier metadata when a verification happens through the UI. */
export function storeVerifierMeta(
  profilePda: string,
  jobId: string,
  meta: VerifierMeta
): void {
  const map = getVerifierMetaMap();
  map[`${profilePda}:${jobId}`] = meta;
  try {
    localStorage.setItem(VERIFIER_META_KEY, JSON.stringify(map));
  } catch {
    // fail silently
  }
}

/** Get verifier metadata for a work record. */
export function getVerifierMeta(
  profilePda: string,
  jobId: string
): VerifierMeta | null {
  const map = getVerifierMetaMap();
  return map[`${profilePda}:${jobId}`] ?? null;
}

// ── Trust Signal Computation ──

export type TrustSignal = {
  label: string;
  value: string;
  positive: boolean;
};

/**
 * Compute trust signals from on-chain work records.
 * Used for the "Why Trusted" dynamic engine.
 */
export function computeTrustSignals(
  records: Array<{ verified: boolean; jobId: string; profile: { toBase58?: () => string } }>,
  profilePdaStr: string,
  reputationScore: number
): TrustSignal[] {
  const signals: TrustSignal[] = [];

  const verified = records.filter((r) => r.verified).length;
  const rejected = records.filter(
    (r) => !r.verified && isRejected(profilePdaStr, r.jobId)
  ).length;
  const pending = records.length - verified - rejected;

  if (verified > 0) {
    signals.push({
      label: "Verified contributions",
      value: `${verified}`,
      positive: true,
    });
  }

  if (rejected === 0 && records.length > 0) {
    signals.push({
      label: "Zero disputes",
      value: "Clean record",
      positive: true,
    });
  } else if (rejected > 0) {
    signals.push({
      label: "Disputed submissions",
      value: `${rejected}`,
      positive: false,
    });
  }

  if (reputationScore >= 100) {
    signals.push({
      label: "Trust tier",
      value: "Elite contributor",
      positive: true,
    });
  } else if (reputationScore >= 50) {
    signals.push({
      label: "Trust tier",
      value: "Trusted contributor",
      positive: true,
    });
  } else if (reputationScore >= 20) {
    signals.push({
      label: "Trust tier",
      value: "Rising contributor",
      positive: true,
    });
  }

  if (pending > 0) {
    signals.push({
      label: "Pending review",
      value: `${pending} submission${pending !== 1 ? "s" : ""}`,
      positive: true,
    });
  }

  if (records.length >= 5) {
    signals.push({
      label: "Contribution consistency",
      value: `${records.length} total submissions`,
      positive: true,
    });
  }

  return signals;
}
