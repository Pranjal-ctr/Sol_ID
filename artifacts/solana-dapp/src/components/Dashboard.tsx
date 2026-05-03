/**
 * Dashboard — displays the connected wallet's on-chain identity and reputation.
 *
 * Data is fetched from the UserProfile PDA (seeds: ["profile", wallet]) and
 * WorkRecord PDAs (filtered by profile pubkey) via the useProgram hook.
 *
 * Stats shown:
 *   - Username (with .sol suffix)
 *   - Reputation score (with gradient display)
 *   - Total works submitted
 *   - Verified count / Pending count breakdown
 */

import { useProgram } from "@/hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ReputationRing({ score }: { score: number }) {
  const MAX    = 200;
  const pct    = Math.min(score / MAX, 1);
  const R      = 40;
  const circ   = 2 * Math.PI * R;
  const dash   = pct * circ;

  return (
    <svg className="db-ring-svg" viewBox="0 0 100 100" aria-hidden>
      {/* Track */}
      <circle
        cx="50" cy="50" r={R}
        fill="none"
        stroke="hsl(230 18% 17%)"
        strokeWidth="8"
      />
      {/* Progress */}
      <circle
        cx="50" cy="50" r={R}
        fill="none"
        stroke="url(#repGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
      <defs>
        <linearGradient id="repGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="hsl(261 75% 65%)" />
          <stop offset="100%" stopColor="hsl(165 72% 50%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "purple" | "teal" | "amber";
}) {
  return (
    <div className={`db-stat-card db-stat-card--${accent ?? "purple"}`}>
      <div className="db-stat-label">{label}</div>
      <div className="db-stat-value">{value}</div>
      {sub && <div className="db-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile, workRecords, loading, refresh } = useProgram();
  const { publicKey } = useWallet();

  const verified = workRecords.filter((w) => w.verified).length;
  const pending  = workRecords.filter((w) => !w.verified).length;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="db-skeleton">
        <div className="db-skeleton-avatar" />
        <div className="db-skeleton-line db-skeleton-line--wide" />
        <div className="db-skeleton-line" />
        <div className="db-skeleton-grid">
          <div className="db-skeleton-card" />
          <div className="db-skeleton-card" />
          <div className="db-skeleton-card" />
        </div>
      </div>
    );
  }

  // ── No profile yet ────────────────────────────────────────────────────────
  if (!profile) return null;

  const repScore = profile.reputationScore ?? 0;
  const repTier  =
    repScore >= 100 ? "Elite"    :
    repScore >= 50  ? "Trusted"  :
    repScore >= 20  ? "Rising"   :
                     "Newcomer";

  const tierColor =
    repScore >= 100 ? "db-tier--elite"   :
    repScore >= 50  ? "db-tier--trusted" :
    repScore >= 20  ? "db-tier--rising"  :
                     "db-tier--new";

  return (
    <div className="db-wrap">
      {/* ── Identity hero ── */}
      <div className="db-hero">
        {/* Reputation ring + score */}
        <div className="db-ring-wrap">
          <ReputationRing score={repScore} />
          <div className="db-ring-center">
            <span className="db-ring-score">{repScore}</span>
            <span className="db-ring-label">rep</span>
          </div>
        </div>

        {/* Username + tier */}
        <div className="db-identity">
          <div className="db-username">
            {profile.username}
            <span className="db-sol-suffix">.sol</span>
          </div>
          <span className={`db-tier ${tierColor}`}>{repTier}</span>

          {publicKey && (
            <div className="db-wallet-addr">
              {publicKey.toBase58().slice(0, 8)}…{publicKey.toBase58().slice(-8)}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button className="db-refresh-btn" onClick={refresh} disabled={loading} title="Refresh on-chain data">
          <span className={loading ? "db-spin" : ""}>↻</span>
        </button>
      </div>

      {/* ── Stats grid ── */}
      <div className="db-stats-grid">
        <StatCard
          label="Reputation Score"
          value={repScore}
          sub="Points earned on-chain"
          accent="purple"
        />
        <StatCard
          label="Works Submitted"
          value={profile.workCount ?? 0}
          sub={`${verified} verified · ${pending} pending`}
          accent="teal"
        />
        <StatCard
          label="Tier"
          value={repTier}
          sub={repScore >= 100 ? "Max tier reached" : `${Math.max(0, (repScore >= 100 ? 100 : repScore >= 50 ? 50 : repScore >= 20 ? 20 : 0) + (repScore >= 100 ? 0 : repScore >= 50 ? 50 : repScore >= 20 ? 30 : 20) - repScore)} pts to next tier`}
          accent="amber"
        />
      </div>

      {/* ── On-chain proof note ── */}
      <div className="db-proof-note">
        <span className="db-proof-dot" />
        Live data fetched from Solana Devnet · PDA seed{" "}
        <code className="db-proof-code">["profile", wallet]</code>
      </div>
    </div>
  );
}
