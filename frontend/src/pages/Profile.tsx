import { useProgram } from "@/hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProfilePda } from "@/lib/program";
import { resolveWorkStatus, WorkStatus, computeTrustSignals, getVerifierMeta } from "@/lib/trustConfig";
import {
  Zap,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Globe,
  CheckCircle,
  Code,
  Star,
} from "lucide-react";
import { useState } from "react";

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

export default function Profile() {
  const { profile, workRecords } = useProgram();
  const { publicKey } = useWallet();
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showJson, setShowJson] = useState(false);

  if (!profile || !publicKey) return null;

  const repScore = profile.reputationScore ?? 0;
  const tier = getTier(repScore);
  const profilePdaStr = getProfilePda(publicKey)[0].toBase58();
  const verified = workRecords.filter((w) => w.verified).length;
  const rejectedCount = workRecords.filter(
    (w) => !w.verified && resolveWorkStatus(w.verified, profilePdaStr, w.jobId) === WorkStatus.Rejected
  ).length;
  const pendingCount = workRecords.filter(
    (w) => !w.verified && resolveWorkStatus(w.verified, profilePdaStr, w.jobId) === WorkStatus.Pending
  ).length;
  const walletStr = publicKey.toBase58();
  const identity = parseIdentity(profile.username);
  const trustSignals = computeTrustSignals(workRecords as any, profilePdaStr, repScore);
  const uniqueVerifiers = [...new Set(
    workRecords
      .map((w) => getVerifierMeta(profilePdaStr, w.jobId))
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => m.verifierWallet)
  )];
  const currentTierIdx = TIERS.findIndex((t) => repScore < (TIERS[TIERS.indexOf(t) + 1]?.min ?? Infinity));

  const ecosystemData = {
    identity: profile.username,
    wallet: walletStr,
    trustScore: repScore,
    tier: tier.name,
    verifiedProofs: verified,
    totalProofs: profile.workCount ?? 0,
    successRate: workRecords.length > 0 ? `${Math.round((verified / workRecords.length) * 100)}%` : "N/A",
    identityProvider: identity.isSns ? "Solana Name Service" : "TrustLayer",
    network: "Solana Devnet",
    protocol: "TrustLayer v0.1.0",
  };

  function copyAddress() {
    navigator.clipboard.writeText(walletStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyEcosystemJson() {
    navigator.clipboard.writeText(JSON.stringify(ecosystemData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Identity Passport</h1>
        <p className="text-sm text-white/30 mt-0.5">Your portable on-chain identity and trust profile</p>
      </div>

      {/* Hero identity card */}
      <div className="trust-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="relative flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-2xl font-black text-white shadow-glow flex-shrink-0 animate-trust-pulse">
            {identity.name.slice(0, 2).toUpperCase()}
          </div>
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

            {/* Contributor metadata */}
            <p className="text-xs text-white/30 mb-2">Solana Contributor · On-Chain Verified</p>

            <div className="flex items-center gap-2">
              <p className="text-[11px] text-white/25 font-mono truncate">{walletStr}</p>
              <button onClick={copyAddress} className="text-white/25 hover:text-white/50 transition-colors">
                {copied ? <Check className="w-3 h-3 text-trust-verified" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-trust-verified shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              <span className="text-[11px] text-trust-verified/70 font-medium">Identity verified on-chain</span>
              {identity.isSns ? (
                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/70 bg-emerald-500/[0.06] px-2 py-0.5 rounded font-semibold">
                  <Globe className="w-2.5 h-2.5" />SNS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] text-brand-400/70 bg-brand-500/[0.04] px-2 py-0.5 rounded font-semibold">
                  <Shield className="w-2.5 h-2.5" />TL
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Verified By — asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4">
        {/* Trust stats */}
        <div className="glass-card p-5">
          <p className="section-label mb-3">Trust Score (Reputation)</p>
          <div className="flex items-center gap-4 mb-4">
            <Zap className="w-5 h-5 text-brand-400" />
            <span className="text-3xl font-black neon-text">{repScore}</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between"><span className="text-xs text-white/30">Total Proofs</span><span className="text-xs font-bold text-white">{profile.workCount ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-xs text-white/30">Verified</span><span className="text-xs font-bold text-trust-verified">{verified}</span></div>
            <div className="flex justify-between"><span className="text-xs text-white/30">Pending</span><span className="text-xs font-bold text-trust-pending">{pendingCount}</span></div>
            {rejectedCount > 0 && (
              <div className="flex justify-between"><span className="text-xs text-white/30">Rejected</span><span className="text-xs font-bold text-red-400">{rejectedCount}</span></div>
            )}
            <div className="flex justify-between"><span className="text-xs text-white/30">Success Rate</span><span className="text-xs font-bold text-white">{workRecords.length > 0 ? Math.round((verified / workRecords.length) * 100) : 0}%</span></div>
          </div>
          {/* Progression */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              {TIERS.map((t) => (
                <span key={t.name} className={`text-[9px] font-medium ${repScore >= t.min ? "text-white/40" : "text-white/25"}`}>
                  {t.name}
                </span>
              ))}
            </div>
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-blue-500 transition-all duration-700" style={{ width: `${Math.min((repScore / 100) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Trust Credentials */}
        <div className="trust-card p-5">
          <p className="section-label mb-3">Trust Credentials</p>
          <div className="space-y-2.5">
            {trustSignals.length === 0 ? (
              <p className="text-xs text-white/30">No trust signals yet. Submit and get work verified to build credentials.</p>
            ) : (
              trustSignals.map(({ label, value, positive }, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02]">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    positive ? "bg-trust-verified/10 text-trust-verified" : "bg-red-500/10 text-red-400"
                  }`}>
                    {positive ? "✓" : "!"}
                  </div>
                  <div className="flex-1">
                    <span className={`text-xs ${positive ? "text-white/60" : "text-red-400/70"}`}>
                      {value} — {label}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Unique verifiers */}
          {uniqueVerifiers.length > 0 && (
            <>
              <p className="section-label mb-2 mt-4">Validated By</p>
              <div className="space-y-1.5">
                {uniqueVerifiers.map((addr, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                    <Shield className="w-3.5 h-3.5 text-brand-400/50" />
                    <span className="text-[11px] text-white/40 font-mono">{addr.slice(0, 6)}...{addr.slice(-4)}</span>
                    <span className="text-[10px] text-emerald-400/60 ml-auto">Trusted Verifier</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* On-chain details */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">On-Chain Details</p>
          <a href={`https://explorer.solana.com/address/${walletStr}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-[11px] text-white/25 hover:text-white/40 transition-colors flex items-center gap-1">
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <span className="text-white/30 text-[10px]">PDA Seeds</span>
            <p className="text-white/50 font-mono mt-1 text-[11px]">["profile", wallet]</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <span className="text-white/30 text-[10px]">Network</span>
            <p className="text-white/50 mt-1 text-[11px]">Solana Devnet</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <span className="text-white/30 text-[10px]">Identity Source</span>
            <p className="text-white/50 mt-1 text-[11px]">{identity.isSns ? "SNS" : "TrustLayer"}</p>
          </div>
        </div>
      </div>

      {/* Ecosystem Preview */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Ecosystem Preview</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowJson(!showJson)} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${showJson ? "text-brand-400 bg-brand-500/[0.06]" : "text-white/25 hover:text-white/40"}`}>
              <Code className="w-3 h-3" />{showJson ? "Cards" : "JSON"}
            </button>
            <button onClick={copyEcosystemJson} className="flex items-center gap-1 text-[11px] text-white/25 hover:text-white/40 transition-colors">
              {copiedJson ? <Check className="w-3 h-3 text-trust-verified" /> : <Copy className="w-3 h-3" />}
              {copiedJson ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-white/30 mb-3">How external applications see your TrustLayer profile</p>

        {showJson ? (
          <div className="rounded-xl bg-surface-50 border border-white/[0.03] p-4 overflow-x-auto">
            <pre className="text-[11px] font-mono text-white/50 leading-relaxed whitespace-pre">
              {JSON.stringify(ecosystemData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.03] p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/15 to-blue-500/15 border border-brand-500/[0.08] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {identity.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">
                    {identity.name}<span className={identity.isSns ? "text-emerald-400" : "text-brand-400"}>{identity.suffix}</span>
                  </p>
                  <p className="text-[10px] text-white/25 font-mono truncate mt-0.5">{walletStr}</p>
                </div>
                <span className={`tier-badge text-[10px] ${tier.color} ${tier.bg} ${tier.border}`}>{tier.name}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: repScore, label: "Trust", className: "neon-text" },
                { value: verified, label: "Verified", className: "text-trust-verified" },
                { value: profile.workCount ?? 0, label: "Proofs", className: "text-white" },
                { value: ecosystemData.successRate, label: "Rate", className: "text-white" },
              ].map(({ value, label, className }) => (
                <div key={label} className="rounded-lg bg-white/[0.02] border border-white/[0.03] p-3 text-center">
                  <p className={`text-lg font-bold ${className}`}>{value}</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
