import { useState, useEffect, useCallback } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { fetchAllProfiles } from "@/lib/program";
import { PublicKey } from "@solana/web3.js";
import { TrendingUp, RefreshCw, Loader2, Users } from "lucide-react";

function getTierStyle(tier: string) {
  switch (tier) {
    case "Elite": return "text-brand-400 bg-brand-500/10 border-brand-500/20";
    case "Trusted": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "Rising": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    default: return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  }
}

function getTier(score: number) {
  if (score >= 100) return "Elite";
  if (score >= 50) return "Trusted";
  if (score >= 20) return "Rising";
  return "Newcomer";
}

function parseIdentity(username: string) {
  if (username.endsWith(".sol"))
    return { name: username.slice(0, -4), suffix: ".sol", isSns: true };
  if (username.endsWith(".tl"))
    return { name: username.slice(0, -3), suffix: ".tl", isSns: false };
  return { name: username, suffix: ".tl", isSns: false };
}

type LeaderEntry = {
  wallet: string;
  username: string;
  reputation: number;
  works: number;
  tier: string;
};

export default function Leaderboard() {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    if (!anchorWallet) return;
    setLoading(true);
    try {
      const allProfiles = await fetchAllProfiles(anchorWallet, connection);
      const sorted = allProfiles
        .map((p) => ({
          wallet: (p.account.wallet as PublicKey).toBase58(),
          username: p.account.username,
          reputation: p.account.reputationScore ?? 0,
          works: p.account.workCount ?? 0,
          tier: getTier(p.account.reputationScore ?? 0),
        }))
        .sort((a, b) => b.reputation - a.reputation);
      setLeaders(sorted);
    } catch (err) {
      console.error("[Leaderboard] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [anchorWallet, connection]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Top contributors by on-chain reputation score
          </p>
        </div>
        <button
          onClick={loadLeaderboard}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm !px-4 !py-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          <p className="text-sm text-white/40">Loading profiles from Devnet</p>
        </div>
      ) : leaders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white/50 mb-1">No profiles yet</h3>
          <p className="text-sm text-white/30">Be the first to create a profile and build reputation.</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {leaders.length >= 3 && (
            <div className="grid grid-cols-3 gap-4">
              {leaders.slice(0, 3).map((leader, i) => {
                const identity = parseIdentity(leader.username);
                const gradients = [
                  "from-brand-500/30 to-blue-500/30 border-brand-500/20",
                  "from-white/10 to-white/5 border-white/10",
                  "from-amber-500/20 to-orange-500/20 border-amber-500/20",
                ];
                return (
                  <div
                    key={leader.wallet}
                    className={`glass-card p-5 text-center relative overflow-hidden ${i === 0 ? "ring-1 ring-brand-500/30" : ""}`}
                  >
                    {i === 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-blue-500" />
                    )}
                    <span className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 block">
                      {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"}
                    </span>
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center text-base font-black text-white mb-3`}>
                      {identity.name.slice(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {identity.name}
                      <span className={identity.isSns ? "text-emerald-400" : "text-brand-400"}>
                        {identity.suffix}
                      </span>
                    </h3>
                    <p className="text-2xl font-black neon-text mt-1">{leader.reputation}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                      reputation
                    </p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierStyle(leader.tier)}`}>
                      {leader.tier}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_100px_80px_90px] gap-4 px-5 py-3 border-b border-white/[0.06] text-xs font-semibold text-white/30 uppercase tracking-wider">
              <span>Rank</span>
              <span>Identity</span>
              <span>Reputation</span>
              <span>Works</span>
              <span>Tier</span>
            </div>
            {leaders.map((leader, idx) => {
              const identity = parseIdentity(leader.username);
              return (
                <div
                  key={leader.wallet}
                  className="grid grid-cols-[60px_1fr_100px_80px_90px] gap-4 px-5 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors items-center"
                >
                  <span className="text-sm font-bold text-white/40">#{idx + 1}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {identity.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white truncate">
                      {identity.name}
                      <span className={identity.isSns ? "text-emerald-400/80" : "text-brand-400/80"}>
                        {identity.suffix}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
                    <span className="text-sm font-bold neon-text">{leader.reputation}</span>
                  </div>
                  <span className="text-sm text-white/50">{leader.works}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border text-center ${getTierStyle(leader.tier)}`}>
                    {leader.tier}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center gap-2 text-xs text-white/25 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)] animate-pulse" />
        Live data — querying all UserProfile PDAs from Solana Devnet
      </div>
    </div>
  );
}
