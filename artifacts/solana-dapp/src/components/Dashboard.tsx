import { useProgram } from "@/hooks/useProgram";

function ReputationRing({ score }: { score: number }) {
  const MAX = 200;
  const pct = Math.min(score / MAX, 1);
  const R = 40;
  const circ = 2 * Math.PI * R;
  const dash = pct * circ;

  return (
    <svg className="db-ring-svg" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(230 18% 17%)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={R}
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
          <stop offset="0%" stopColor="hsl(261 75% 65%)" />
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

function ReputationBadge({ score }: { score: number }) {
  if (score > 100) {
    return <span className="db-rep-badge db-rep-badge--elite">Elite Contributor</span>;
  }
  if (score > 50) {
    return <span className="db-rep-badge db-rep-badge--trusted">Trusted Freelancer</span>;
  }
  return null;
}

export default function Dashboard() {
  const { profile, workRecords, loading, refresh } = useProgram();

  const verified = workRecords.filter((w) => w.verified).length;
  const pending = workRecords.filter((w) => !w.verified).length;

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

  if (!profile) return null;

  const repScore = profile.reputationScore ?? 0;
  const repTier =
    repScore >= 100 ? "Elite" :
    repScore >= 50 ? "Trusted" :
    repScore >= 20 ? "Rising" :
    "Newcomer";

  const tierColor =
    repScore >= 100 ? "db-tier--elite" :
    repScore >= 50 ? "db-tier--trusted" :
    repScore >= 20 ? "db-tier--rising" :
    "db-tier--new";

  const nextTierPts =
    repScore >= 100 ? 0 :
    repScore >= 50 ? 100 - repScore :
    repScore >= 20 ? 50 - repScore :
    20 - repScore;

  return (
    <div className="db-wrap">
      <div className="db-hero">
        <div className="db-ring-wrap">
          <ReputationRing score={repScore} />
          <div className="db-ring-center">
            <span className="db-ring-score">{repScore}</span>
            <span className="db-ring-label">rep</span>
          </div>
        </div>

        <div className="db-identity">
          <div className="db-username">
            {profile.username}
            <span className="db-sol-suffix">.sol</span>
          </div>
          <div className="db-hero-row">
            <span className={`db-tier ${tierColor}`}>{repTier}</span>
            <span className="db-score-badge">{repScore} points</span>
            <ReputationBadge score={repScore} />
          </div>
          <div className="db-pda-note">
            UserProfile PDA · <code>["profile", wallet]</code>
          </div>
        </div>

        <button className="db-refresh-btn" onClick={refresh} disabled={loading} title="Refresh on-chain data">
          <span className={loading ? "db-spin" : ""}>↻</span>
        </button>
      </div>

      <div className="db-stats-grid">
        <StatCard label="Reputation Score" value={repScore} sub="Points earned on-chain" accent="purple" />
        <StatCard label="Works Submitted" value={profile.workCount ?? 0} sub={`${verified} verified · ${pending} pending`} accent="teal" />
        <StatCard label="Tier" value={repTier} sub={repScore >= 100 ? "Max tier reached" : `${nextTierPts} pts to next tier`} accent="amber" />
      </div>

      <div className="db-proof-note">
        <span className="db-proof-dot" />
        Live data fetched from Solana Devnet · PDA seed <code>["profile", wallet]</code>
      </div>
    </div>
  );
}
