import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { fetchProfile, fetchWorkRecords, searchProfileByUsername } from "@/lib/program";
import {
  Globe,
  Search,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Zap,
  CheckCircle,
  Shield,
  Code,
  Users,
  Briefcase,
  Landmark,
  Award,
  Bot,
  Terminal,
} from "lucide-react";

function getTier(score: number) {
  if (score >= 100) return { name: "Elite", color: "text-brand-400", bg: "bg-brand-500/[0.06]", border: "border-brand-500/[0.1]" };
  if (score >= 50) return { name: "Trusted", color: "text-emerald-400", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/[0.1]" };
  if (score >= 20) return { name: "Rising", color: "text-amber-400", bg: "bg-amber-500/[0.06]", border: "border-amber-500/[0.1]" };
  return { name: "Newcomer", color: "text-blue-400", bg: "bg-blue-500/[0.06]", border: "border-blue-500/[0.1]" };
}

function parseIdentity(username: string) {
  if (username.endsWith(".sol")) return { name: username.slice(0, -4), suffix: ".sol", isSns: true };
  if (username.endsWith(".tl")) return { name: username.slice(0, -3), suffix: ".tl", isSns: false };
  return { name: username, suffix: ".tl", isSns: false };
}

const INTEGRATIONS = [
  { icon: Users, title: "DAO Governance", desc: "Weight votes by trust score", color: "#a78bfa" },
  { icon: Briefcase, title: "Hiring", desc: "Verify contributor history", color: "#3b82f6" },
  { icon: Landmark, title: "DeFi Lending", desc: "Under-collateralized loans", color: "#22d3ee" },
  { icon: Award, title: "Grants", desc: "Merit-based allocation", color: "#34d399" },
  { icon: Zap, title: "Hackathons", desc: "Sybil-resistant judging", color: "#fbbf24" },
  { icon: Bot, title: "AI Agents", desc: "Establish on-chain trust", color: "#f472b6" },
];

type QueryResult = {
  identity: string;
  wallet: string;
  trustScore: number;
  tier: string;
  verifiedProofs: number;
  totalProofs: number;
  successRate: string;
  identityProvider: string;
  isSns: boolean;
  network: string;
  protocol: string;
  timestamp: string;
} | null;

export default function EcosystemQuery() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [apiStep, setApiStep] = useState(0);

  // Animated API simulation
  useEffect(() => {
    if (loading) {
      const steps = [1, 2, 3];
      steps.forEach((s, i) => {
        setTimeout(() => setApiStep(s), (i + 1) * 400);
      });
    } else {
      setApiStep(0);
    }
  }, [loading]);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !input.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const trimmed = input.trim();
      const isUsername = trimmed.endsWith(".sol") || trimmed.endsWith(".tl") || !trimmed.includes(".");

      if (isUsername) {
        const profileData = await searchProfileByUsername(wallet, connection, trimmed);
        if (!profileData) {
          setError(`No TrustLayer profile found for "${trimmed}".`);
          setLoading(false);
          return;
        }
        buildResult(profileData);
      } else {
        let queryKey: PublicKey;
        try { queryKey = new PublicKey(trimmed); } catch {
          setError("Invalid input. Enter a username or wallet address.");
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
        const profile = await fetchProfile(wallet, connection, queryKey);
        if (!profile) { setError("No TrustLayer profile found for this wallet."); setLoading(false); return; }
        const records = await fetchWorkRecords(wallet, connection, queryKey);
        const verified = records.filter((r: any) => r.verified).length;
        buildResult({ wallet: queryKey, username: profile.username, reputationScore: profile.reputationScore ?? 0, workCount: profile.workCount ?? 0, verifiedWorks: verified, totalWorks: records.length });
      }
    } catch (err) {
      console.error("[EcosystemQuery]", err);
      setError("Query failed. Check input and try again.");
    } finally {
      setLoading(false);
    }
  }

  function buildResult(data: { wallet: PublicKey; username: string; reputationScore: number; workCount: number; verifiedWorks: number; totalWorks: number }) {
    const identity = parseIdentity(data.username);
    const tier = getTier(data.reputationScore);
    setResult({
      identity: data.username,
      wallet: data.wallet.toBase58(),
      trustScore: data.reputationScore,
      tier: tier.name,
      verifiedProofs: data.verifiedWorks,
      totalProofs: data.totalWorks,
      successRate: data.totalWorks > 0 ? `${Math.round((data.verifiedWorks / data.totalWorks) * 100)}%` : "N/A",
      identityProvider: identity.isSns ? "Solana Name Service" : "TrustLayer",
      isSns: identity.isSns,
      network: "Solana Devnet",
      protocol: "TrustLayer v0.1.0",
      timestamp: new Date().toISOString(),
    });
    setLoading(false);
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function useOwnWallet() {
    if (wallet?.publicKey) {
      setInput(wallet.publicKey.toBase58());
      setResult(null);
      setError(null);
    }
  }

  const identity = result ? parseIdentity(result.identity) : null;
  const tier = result ? getTier(result.trustScore) : null;
  const apiEndpoint = input.trim() ? `GET /trustlayer/reputation/${input.trim()}` : "GET /trustlayer/reputation/{identity}";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ecosystem Query</h1>
        <p className="text-sm text-white/30 mt-0.5">Query TrustLayer reputation as external applications would</p>
      </div>

      {/* API-style header */}
      <div className="trust-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/[0.08] flex items-center justify-center flex-shrink-0">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white/80 mb-1">Composable Trust Infrastructure</h2>
            <p className="text-xs text-white/30 leading-relaxed">
              Any Solana application can query TrustLayer to verify a contributor's trust score. Search by <strong className="text-white/50">username</strong> or <strong className="text-white/50">wallet address</strong>.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.04] text-white/30 font-medium">External App</span>
              <ArrowRight className="w-3 h-3 text-white/10" />
              <span className="px-2.5 py-1 rounded-md bg-brand-500/[0.04] border border-brand-500/[0.08] text-brand-400/70 font-medium">TrustLayer PDA</span>
              <ArrowRight className="w-3 h-3 text-white/10" />
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/[0.04] border border-emerald-500/[0.08] text-trust-verified/70 font-medium">Trust Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoint simulation */}
      <div className="rounded-xl bg-surface-50 border border-white/[0.04] p-4 font-mono text-sm">
        <div className="flex items-center gap-2 text-white/30">
          <span className="text-trust-verified font-bold text-xs">GET</span>
          <span className="text-white/50">{apiEndpoint}</span>
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-[10px]">
              {apiStep >= 1 && <span className="text-trust-verified animate-fade-in">resolving</span>}
              {apiStep >= 2 && <span className="text-brand-400 animate-fade-in">querying</span>}
              {apiStep >= 3 && <span className="text-cyan-400 animate-fade-in">building</span>}
            </div>
          )}
          {result && <span className="ml-auto text-trust-verified text-xs">200 OK</span>}
        </div>
      </div>

      {/* Search form */}
      <div className="glass-card p-6 max-w-2xl">
        <form onSubmit={handleQuery} noValidate className="space-y-4">
          <div>
            <label htmlFor="eq-input" className="flex items-center justify-between text-sm font-medium text-white/50 mb-2">
              <span>Identity or Wallet Address</span>
              {wallet?.publicKey && (
                <button type="button" onClick={useOwnWallet} className="text-[11px] text-brand-400/70 hover:text-brand-400 transition-colors font-medium">
                  Use my wallet
                </button>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" />
              <input
                id="eq-input" type="text"
                placeholder="alice.sol, pranjal.tl, or wallet address"
                value={input}
                onChange={(e) => { setInput(e.target.value); setResult(null); setError(null); }}
                className="input-field pl-10"
              />
            </div>
          </div>
          <button type="submit" disabled={!input.trim() || loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Querying TrustLayer...</>) : (<><Globe className="w-4 h-4" />Query Trust Score</>)}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-red-500/[0.04] border border-red-500/[0.08] animate-slide-up">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && identity && tier && (
          <div className="mt-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-trust-verified shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                <span className="text-xs font-semibold text-trust-verified/80">TrustLayer Response</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowJson(!showJson)} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${showJson ? "text-brand-400 bg-brand-500/[0.06]" : "text-white/25 hover:text-white/40"}`}>
                  <Code className="w-3 h-3" />{showJson ? "Cards" : "JSON"}
                </button>
                <button onClick={copyResult} className="flex items-center gap-1 text-[11px] text-white/25 hover:text-white/40 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-trust-verified" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {showJson ? (
              <div className="rounded-xl bg-surface-50 border border-white/[0.03] p-4 overflow-x-auto">
                <pre className="text-[11px] font-mono text-white/50 leading-relaxed whitespace-pre">{JSON.stringify(result, null, 2)}</pre>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.03] p-5">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-lg font-black text-white shadow-glow-sm flex-shrink-0">
                      {identity.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="identity-name">
                          {identity.name}<span className={identity.isSns ? "text-emerald-400 font-semibold" : "text-brand-400 font-semibold"}>{identity.suffix}</span>
                        </h3>
                        <span className={`tier-badge ${tier.color} ${tier.bg} ${tier.border}`}>{tier.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {result.isSns ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70 font-medium"><Globe className="w-3 h-3" />SNS Verified</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-brand-400/70 font-medium"><Shield className="w-3 h-3" />TrustLayer Identity</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/25 font-mono truncate">{result.wallet}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: result.trustScore, label: "Trust", cls: "neon-text" },
                    { value: result.verifiedProofs, label: "Verified", cls: "text-trust-verified" },
                    { value: result.totalProofs, label: "Proofs", cls: "text-white" },
                    { value: result.successRate, label: "Rate", cls: "text-white" },
                  ].map(({ value, label, cls }) => (
                    <div key={label} className="rounded-lg bg-white/[0.02] border border-white/[0.03] p-3 text-center">
                      <p className={`text-lg font-bold ${cls}`}>{value}</p>
                      <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <a href={`https://explorer.solana.com/address/${result.wallet}?cluster=devnet`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-white/25 hover:text-white/40 transition-colors">
                  <ExternalLink className="w-3 h-3" />View on Explorer
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SDK Preview */}
      <div className="glass-card p-5">
        <p className="section-label mb-3">Developer Integration</p>
        <div className="rounded-xl bg-surface-50 border border-white/[0.03] p-4 space-y-3 font-mono text-[11px]">
          <div>
            <span className="text-white/20">$ </span>
            <span className="text-trust-verified/70">npm install</span>
            <span className="text-white/40"> @trustlayer/sdk</span>
          </div>
          <div className="border-t border-white/[0.03] pt-3">
            <div className="text-white/20">// Query any Solana identity</div>
            <div><span className="text-brand-400/70">const</span> <span className="text-white/50">profile</span> <span className="text-white/20">=</span> <span className="text-brand-400/70">await</span> <span className="text-cyan-400/70">trustlayer</span><span className="text-white/30">.getProfile(</span><span className="text-trust-verified/70">"alice.sol"</span><span className="text-white/30">)</span></div>
            <div><span className="text-brand-400/70">const</span> <span className="text-white/50">score</span> <span className="text-white/20">=</span> <span className="text-white/40">profile.trustScore</span> <span className="text-white/20">// 127</span></div>
          </div>
        </div>
        <p className="text-[11px] text-white/30 mt-3">Composable API for any Solana application to query trust data</p>
      </div>

      {/* Ecosystem Integrations */}
      <div>
        <p className="section-label mb-3 px-1">Who queries TrustLayer?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {INTEGRATIONS.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="glass-card-hover p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 border" style={{ background: `${color}06`, borderColor: `${color}12` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <h4 className="text-sm font-semibold text-blue-400/70 mb-0.5">{title}</h4>
              <p className="text-[15px] text-white/60">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/50 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-trust-verified shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
        Querying live data from Solana Devnet via TrustLayer protocol
      </div>
    </div>
  );
}
