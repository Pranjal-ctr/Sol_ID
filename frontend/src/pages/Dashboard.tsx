import { useProgram } from "@/hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProfilePda } from "@/lib/program";
import { resolveWorkStatus, WorkStatus, computeTrustSignals } from "@/lib/trustConfig";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  RefreshCw,
  Zap,
  Globe,
  Shield,
  Star,
} from "lucide-react";

function parseIdentity(username: string) {
  if (username.endsWith(".sol"))
    return { name: username.slice(0, -4), suffix: ".sol", isSns: true };
  if (username.endsWith(".tl"))
    return { name: username.slice(0, -3), suffix: ".tl", isSns: false };
  return { name: username, suffix: ".tl", isSns: false };
}

function getTier(score: number) {
  if (score >= 100) return { name: "Elite", color: "text-brand-400", bg: "bg-brand-500/[0.06]", border: "border-brand-500/[0.1]" };
  if (score >= 50) return { name: "Trusted", color: "text-emerald-400", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/[0.1]" };
  if (score >= 20) return { name: "Rising", color: "text-amber-400", bg: "bg-amber-500/[0.06]", border: "border-amber-500/[0.1]" };
  return { name: "Newcomer", color: "text-blue-400", bg: "bg-blue-500/[0.06]", border: "border-blue-500/[0.1]" };
}

const TIERS = [
  { name: "Newcomer", min: 0, color: "#3b82f6" },
  { name: "Rising", min: 20, color: "#fbbf24" },
  { name: "Trusted", min: 50, color: "#34d399" },
  { name: "Elite", min: 100, color: "#a78bfa" },
];

function ReputationRing({ score }: { score: number }) {
  const MAX = 200;
  const pct = Math.min(score / MAX, 1);
  const R = 42;
  const circ = 2 * Math.PI * R;
  const dash = pct * circ;
  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(124,58,237,0.06)" strokeWidth="5" />
        <circle cx="50" cy="50" r={R} fill="none" stroke="url(#trustGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} className="rep-ring-track" />
        <defs>
          <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black neon-text">{score}</span>
        <span className="text-[9px] uppercase tracking-widest text-white/25 font-semibold">trust</span>
      </div>
    </div>
  );
}

/* Mini trust graph */

function TrustGraphPreview({ username }: { username: string }) {
  const identity = parseIdentity(username);

  const nodes = [
    {
      label: "DAO",
      sub: "Governance Layer",
      position: "top-left",
      glow: "from-violet-500/20 to-fuchsia-500/10",
      border: "border-violet-400/20",
      signal: "bg-violet-300",
      float: "animate-float",
    },
    {
      label: "Verified Work",
      sub: "Contribution Proof",
      position: "top-right",
      glow: "from-cyan-500/20 to-blue-500/10",
      border: "border-cyan-400/20",
      signal: "bg-cyan-300",
      float: "animate-float-delay",
    },
    {
      label: "Protocol",
      sub: "Identity Infrastructure",
      position: "bottom-left",
      glow: "from-emerald-500/20 to-green-500/10",
      border: "border-emerald-400/20",
      signal: "bg-emerald-300",
      float: "animate-float-delay",
    },
    {
      label: "Reviewer",
      sub: "Trust Validation",
      position: "bottom-right",
      glow: "from-amber-500/20 to-orange-500/10",
      border: "border-amber-400/20",
      signal: "bg-amber-300",
      float: "animate-float",
    },
  ];

  const positions: Record<string, string> = {
    "top-left": "left-[12%] top-[12%]",
    "top-right": "right-[12%] top-[12%]",
    "bottom-left": "left-[12%] bottom-[10%]",
    "bottom-right": "right-[12%] bottom-[10%]",
  };

  const paths = [
    "M50 50 Q38 38 24 27",
    "M50 50 Q62 38 76 27",
    "M50 50 Q38 62 24 73",
    "M50 50 Q62 62 76 73",
  ];

  return (
    <div className="relative w-full h-[430px] overflow-hidden rounded-[2rem] border border-white/[0.05] bg-gradient-to-br from-[#0B0B14] to-[#090912] backdrop-blur-2xl">

      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      {/* Ambient Glow */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 w-[420px] h-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_72%)]" />

      {/* SVG NETWORK */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>

          {/* Curved Line Gradients */}
          <linearGradient id="pathGradient1" x1="50%" y1="50%" x2="24%" y2="27%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.9)" />
            <stop offset="72%" stopColor="rgba(139,92,246,0.35)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>

          <linearGradient id="pathGradient2" x1="50%" y1="50%" x2="76%" y2="27%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.9)" />
            <stop offset="72%" stopColor="rgba(139,92,246,0.35)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>

          <linearGradient id="pathGradient3" x1="50%" y1="50%" x2="24%" y2="73%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.9)" />
            <stop offset="72%" stopColor="rgba(139,92,246,0.35)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>

          <linearGradient id="pathGradient4" x1="50%" y1="50%" x2="76%" y2="73%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.9)" />
            <stop offset="72%" stopColor="rgba(139,92,246,0.35)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>

          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

        </defs>

        {paths.map((path, i) => (
          <g key={i}>

            {/* Glow Path */}
            <path
              d={path}
              fill="none"
              stroke="rgba(139,92,246,0.12)"
              strokeWidth="2.4"
              strokeLinecap="round"
              filter="url(#lineGlow)"
            />

            {/* Main Curved Path */}
            <path
              d={path}
              fill="none"
              stroke={`url(#pathGradient${i + 1})`}
              strokeWidth="0.8"
              strokeLinecap="round"
              className="opacity-75"
            />

            {/* Moving Energy Dot */}
            <circle r="1.3" fill="rgba(196,181,253,1)">
              <animateMotion
                dur={`${3.5 + i}s`}
                repeatCount="indefinite"
                path={path}
              />
            </circle>

          </g>
        ))}
      </svg>

      {/* CENTER CORE */}
      <div className="absolute inset-0 flex items-center justify-center z-20">

        {/* Rotating Ring */}
        <div className="absolute w-[210px] h-[210px] rounded-full border border-violet-500/10 animate-spin-slow" />

        {/* Glow */}
        <div className="absolute w-[250px] h-[250px] rounded-full bg-violet-500/10 blur-3xl animate-pulse" />

        {/* Identity Core */}
        <div className="relative flex flex-col items-center justify-center w-36 h-36 rounded-[2.3rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-blue-500/10 backdrop-blur-2xl shadow-[0_0_90px_rgba(139,92,246,0.16)]">

          {/* Inner Glass */}
          <div className="absolute inset-[1px] rounded-[inherit] bg-white/[0.02]" />

          {/* Identity Circle */}
          <div className="relative w-20 h-20 rounded-[1.5rem] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shadow-inner mb-3">

            <span className="text-4xl font-bold text-white tracking-tight">
              {identity.name.slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Identity Label */}
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/65 font-semibold">
            Trust Identity
          </p>

          {/* Username */}
          <p className="text-[10px] text-white/40 mt-2">
            {username}
          </p>
        </div>
      </div>

      {/* NETWORK NODES */}
      {nodes.map((node, i) => (
        <div
          key={i}
          className={`absolute z-10 ${positions[node.position]} ${node.float}`}
        >

          {/* Node Ambient Glow */}
          <div
            className={`absolute inset-0 blur-2xl opacity-40 bg-gradient-to-br ${node.glow}`}
          />

          {/* Node */}
          <div
            className={`
              relative px-6 py-4 rounded-[1.4rem]
              bg-gradient-to-br ${node.glow}
              border ${node.border}
              backdrop-blur-xl
              transition-all duration-500
              hover:-translate-y-1
              hover:border-white/20
              hover:shadow-[0_0_40px_rgba(139,92,246,0.14)]
            `}
          >

            {/* Overlay */}
            <div className="absolute inset-[1px] rounded-[inherit] bg-black/20 backdrop-blur-md" />

            <div className="relative flex items-start gap-3">

              {/* Signal */}
              <div className="relative mt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${node.signal}`} />
                <div className={`absolute inset-0 rounded-full ${node.signal} animate-ping opacity-40`} />
              </div>

              {/* Text */}
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-white/92 tracking-wide whitespace-nowrap">
                  {node.label}
                </span>

                <span className="text-[11px] text-white/55 mt-1 whitespace-nowrap">
                  {node.sub}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Bottom Caption */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20">
        <p className="text-[9px] tracking-[0.32em] uppercase text-white/28 text-center">
          Portable Trust Network
        </p>
      </div>
    </div>
  );
}







export default function Dashboard() {
  const { profile, workRecords, loading, refresh } = useProgram();
  const { publicKey } = useWallet();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="trust-card p-8 flex items-center gap-8">
          <div className="w-32 h-32 rounded-full bg-surface-200 animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-48 bg-surface-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-surface-200 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="glass-card p-5 h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const repScore = profile.reputationScore ?? 0;
  const tier = getTier(repScore);
  const profilePdaStr = getProfilePda(profile.wallet)[0].toBase58();
  const verified = workRecords.filter((w) => w.verified).length;
  const rejected = workRecords.filter(
    (w) => !w.verified && resolveWorkStatus(w.verified, profilePdaStr, w.jobId) === WorkStatus.Rejected
  ).length;
  const pending = workRecords.filter(
    (w) => !w.verified && resolveWorkStatus(w.verified, profilePdaStr, w.jobId) === WorkStatus.Pending
  ).length;
  const identity = parseIdentity(profile.username);
  const trustSignals = computeTrustSignals(workRecords as any, profilePdaStr, repScore);
  const currentTierIdx = TIERS.findIndex((t) => repScore < (TIERS[TIERS.indexOf(t) + 1]?.min ?? Infinity));
  const nextTier = TIERS[currentTierIdx + 1];
  const progressInTier = nextTier
    ? ((repScore - TIERS[currentTierIdx].min) / (nextTier.min - TIERS[currentTierIdx].min)) * 100
    : 100;

  // Build activity items from work records
  const activityItems = workRecords.slice(0, 5).map((w) => ({
    type: w.verified ? "verified" : "submitted",
    label: w.verified ? `Contribution verified — ${w.jobId}` : `Proof submitted — ${w.jobId}`,
    delta: w.verified ? "+10" : "",
    color: w.verified ? "text-trust-verified" : "text-white/40",
    icon: w.verified ? CheckCircle : Upload,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="relative group">
  {/* Subtle ambient glow behind the text */}
          <div className="absolute -inset-1 bg-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <h1 className="relative text-3xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            Trust <span className="text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">Overview</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mt-1">
            Reputation Protocol v1.0
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Trust Passport — asymmetric layout */}
      <div className="trust-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="relative flex items-center gap-8">
          <ReputationRing score={repScore} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="identity-name-lg">
                {identity.name}
                <span className={identity.isSns ? "text-emerald-400 font-semibold" : "text-brand-400 font-semibold"}>
                  {identity.suffix}
                </span>
              </h2>
              <span className={`tier-badge ${tier.color} ${tier.bg} ${tier.border}`}>
                {tier.name}
              </span>
            </div>
            {/* Identity source */}
            <div className="flex items-center gap-2 mb-2">
              {identity.isSns ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80 font-medium">
                  <Globe className="w-3 h-3" />SNS Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-brand-400/80 font-medium">
                  <Shield className="w-3 h-3" />TrustLayer Identity
                </span>
              )}
              <span className="text-white/10">·</span>
              <span className="text-[10px] text-white/25 font-mono">{publicKey?.toBase58()}</span>
            </div>
            {/* Trust score + next tier */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Zap className="w-3.5 h-3.5 text-brand-400" />
                <span className="font-bold text-white">{repScore}</span>
                <span className="text-white/30 text-xs">trust score</span>
              </div>
              {nextTier && (
                <span className="text-[11px] text-white/25 bg-white/[0.03] px-2 py-0.5 rounded-md">
                  {nextTier.min - repScore} to {nextTier.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Progression */}
      <div className="glass-card p-5">
        <p className="section-label mb-3">Trust Progression</p>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            {TIERS.map((t, i) => (
              <div key={t.name} className="flex flex-col items-center" style={{ width: i === 0 || i === TIERS.length - 1 ? "auto" : undefined }}>
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 ${repScore >= t.min ? "" : "opacity-30"}`}
                  style={{ borderColor: t.color, background: repScore >= t.min ? t.color : "transparent" }}
                />
                <span className={`text-[10px] mt-1.5 font-medium ${repScore >= t.min ? "text-white/60" : "text-white/30"}`}>
                  {t.name}
                </span>
                <span className="text-[9px] text-white/20">{t.min}+</span>
              </div>
            ))}
          </div>
          <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(progressInTier, 100)}%`,
                background: `linear-gradient(90deg, ${TIERS[currentTierIdx]?.color ?? "#3b82f6"}, ${nextTier?.color ?? "#a78bfa"})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats + Why Trusted — asymmetric 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        {/* Stats */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <div className="stat-card">
              <div className="w-7 h-7 rounded-lg bg-brand-500/[0.06] flex items-center justify-center mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <p className="text-xl font-bold text-white">{repScore}</p>
              <p className="text-[10px] text-white/35 mt-0.5">Trust Score</p>
            </div>
            <div className="stat-card">
              <div className="w-7 h-7 rounded-lg bg-blue-500/[0.06] flex items-center justify-center mb-2">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-xl font-bold text-white">{profile.workCount ?? 0}</p>
              <p className="text-[10px] text-white/35 mt-0.5">Total Proofs</p>
            </div>
            <div className="stat-card">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.06] flex items-center justify-center mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">{verified}</p>
              <p className="text-[10px] text-white/35 mt-0.5">Verified</p>
            </div>
            <div className="stat-card">
              <div className="w-7 h-7 rounded-lg bg-amber-500/[0.06] flex items-center justify-center mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-white">{pending}</p>
              <p className="text-[10px] text-white/35 mt-0.5">Pending</p>
            </div>
          </div>
          {rejected > 0 && (
            <div className="stat-card">
              <div className="w-7 h-7 rounded-lg bg-red-500/[0.06] flex items-center justify-center mb-2">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <p className="text-xl font-bold text-white">{rejected}</p>
              <p className="text-[10px] text-white/35 mt-0.5">Rejected</p>
            </div>
          )}
        </div>

        {/* Why This Identity Is Trusted */}
        <div className="trust-card p-5">
          <p className="section-label mb-3">Why this identity is trusted</p>
          <div className="space-y-2.5">
            {trustSignals.length === 0 ? (
              <p className="text-xs text-white/30">No trust signals yet. Submit and get work verified to build trust.</p>
            ) : (
              trustSignals.map(({ label, value, positive }, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                    positive ? "bg-trust-verified/10 text-trust-verified" : "bg-red-500/10 text-red-400"
                  }`}>
                    {positive ? "✓" : "!"}
                  </div>
                  <span className={`text-xs ${positive ? "text-white/60" : "text-red-400/70"}`}>
                    {value} — {label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trust Graph + Quick Actions — asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        {/* Trust Graph */}
        <div className="glass-card p-5">
          <p className="section-label mb-2">Trust Network</p>
          <TrustGraphPreview username={profile.username} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Link to="/submit" className="glass-card-hover p-4 block group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/[0.06] border border-brand-500/[0.08] flex items-center justify-center">
                  <Upload className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Submit Proof</h3>
                  <p className="text-[11px] text-white/35">Create a new proof record</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
          <Link to="/verify" className="glass-card-hover p-4 block group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.08] flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Validate</h3>
                  <p className="text-[11px] text-white/35">Review pending contributions</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </div>
      </div>

      {/* Activity Timeline */}
      {activityItems.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Recent Activity</p>
            <Link to="/history" className="text-[11px] text-white/25 hover:text-white/40 transition-colors">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {activityItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.color}`} />
                  <span className="text-xs text-white/50 flex-1">{item.label}</span>
                  {item.delta && (
                    <span className="text-[11px] font-bold text-trust-verified">{item.delta}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-[11px] text-white/25 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-trust-verified shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
        Live data from Solana Devnet
      </div>
    </div>
  );
}
