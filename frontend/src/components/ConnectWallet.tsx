import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Shield,
  Zap,
  Globe,
  Lock,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Users,
  Bot,
  Landmark,
  Briefcase,
  Award,
  Layers,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { IDL } from "@/lib/idl";

/* ── Identity Node Graph ── */
function IdentityGraph() {
  const nodes = [
    { label: "DAO", angle: 0, color: "#a78bfa" },
    { label: "Hiring", angle: 60, color: "#3b82f6" },
    { label: "DeFi", angle: 120, color: "#22d3ee" },
    { label: "Grants", angle: 180, color: "#34d399" },
    { label: "Hackathons", angle: 240, color: "#fbbf24" },
    { label: "AI Agents", angle: 300, color: "#f472b6" },
  ];
  const R = 120;

  return (
    <div className="relative w-[300px] h-[300px] mx-auto mb-12">
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
        {nodes.map((n, i) => {
          const rad = (n.angle * Math.PI) / 180;
          const x = 150 + R * Math.cos(rad);
          const y = 150 + R * Math.sin(rad);
          return (
            <line
              key={i}
              x1="150" y1="150" x2={x} y2={y}
              className="trust-connection"
              stroke={n.color}
              strokeWidth="1"
              opacity="0.2"
            />
          );
        })}
      </svg>

      {/* Center node */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center shadow-glow animate-trust-pulse">
            <Layers className="w-9 h-9 text-white" />
          </div>
          <div className="absolute -inset-3 bg-brand-500/10 rounded-3xl blur-xl -z-10 animate-identity-glow" />
        </div>
        <p className="text-xs font-bold text-white/60 text-center mt-2 tracking-wide">alice.sol</p>
      </div>

      {/* Orbiting nodes */}
      {nodes.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const x = 150 + R * Math.cos(rad) - 28;
        const y = 150 + R * Math.sin(rad) - 16;
        return (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: x, top: y, width: 56 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                background: `${n.color}10`,
                borderColor: `${n.color}25`,
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: n.color, opacity: 0.7 }} />
            </div>
            <span className="text-[10px] font-semibold text-white/50 mt-1 whitespace-nowrap">{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Problem Cards ── */
const PROBLEMS = [
  { title: "Anonymous Wallets", desc: "Hard to trust contributors with no verifiable history", color: "text-red-400", bg: "bg-red-500/[0.04]", border: "border-red-500/[0.08]" },
  { title: "Fragmented Reputation", desc: "No portable credibility across Solana applications", color: "text-amber-400", bg: "bg-amber-500/[0.04]", border: "border-amber-500/[0.08]" },
  { title: "Fake Reviews", desc: "Existing reputation systems are easily manipulated", color: "text-orange-400", bg: "bg-orange-500/[0.04]", border: "border-orange-500/[0.08]" },
  { title: "No Proof-of-Work", desc: "Hiring and grants have no on-chain verification layer", color: "text-rose-400", bg: "bg-rose-500/[0.04]", border: "border-rose-500/[0.08]" },
];

/* ── Ecosystem Use Cases ── */
const ECOSYSTEM = [
  { icon: Users, title: "DAO Governance", desc: "Weight votes by trust score", color: "#a78bfa" },
  { icon: Briefcase, title: "Hiring", desc: "Verify contributor history", color: "#3b82f6" },
  { icon: Landmark, title: "DeFi", desc: "Under-collateralized lending", color: "#22d3ee" },
  { icon: Award, title: "Grants", desc: "Merit-based allocation", color: "#34d399" },
  { icon: Zap, title: "Hackathons", desc: "Sybil-resistant judging", color: "#fbbf24" },
  { icon: Bot, title: "AI Agents", desc: "Establish on-chain trust", color: "#f472b6" },
];

/* ── Protocol Stats (fetched live) ── */
type ProtocolStat = { label: string; value: string };

function useProtocolStats(): ProtocolStat[] {
  const [stats, setStats] = useState<ProtocolStat[]>([
    { label: "Profiles", value: "..." },
    { label: "Verified Proofs", value: "..." },
    { label: "Work Records", value: "..." },
    { label: "Network", value: "Devnet" },
  ]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        // Read-only provider (no wallet needed)
        const dummyWallet = { publicKey: null, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs };
        const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
        const program = new Program(IDL as unknown as Idl, provider);

        const [allProfiles, allRecords] = await Promise.all([
          (program.account as any).userProfile.all(),
          (program.account as any).workRecord.all(),
        ]);

        const profileCount = allProfiles.length;
        const verifiedCount = allRecords.filter((r: any) => r.account.verified).length;
        const totalRecords = allRecords.length;

        setStats([
          { label: "Profiles", value: profileCount.toString() },
          { label: "Verified Proofs", value: verifiedCount.toString() },
          { label: "Work Records", value: totalRecords.toString() },
          { label: "Network", value: "Devnet" },
        ]);
      } catch (err) {
        console.warn("[ConnectWallet] Failed to fetch protocol stats:", err);
      }
    }

    fetchStats();
  }, []);

  return stats;
}

export default function ConnectWallet() {
  const { connecting } = useWallet();
  const [hasPhantom, setHasPhantom] = useState(true);
  const protocolStats = useProtocolStats();

  useEffect(() => {
    const timer = setTimeout(() => {
      const isPhantom =
        typeof window !== "undefined" &&
        ((window as any).phantom?.solana?.isPhantom ||
          (window as any).solana?.isPhantom);
      setHasPhantom(!!isPhantom);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-surface">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-600/[0.05] rounded-full blur-[200px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] bg-blue-600/[0.03] rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.2) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white/90">TrustLayer</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-2.5 py-1 rounded-full border border-white/[0.06]">
            Devnet
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl animate-fade-in">

          {/* Animated identity graph */}
          <IdentityGraph />

          {/* Headline */}
          <h1 className="text-5xl font-black tracking-tight leading-[1.1] mb-4" style={{ letterSpacing: "-0.03em" }}>
            <span className="text-white">Trust Infrastructure</span>
            <br />
            <span className="neon-text">for Solana Identities</span>
          </h1>
          <p className="text-lg text-white/50 font-medium max-w-lg mb-3 leading-relaxed">
            Transform wallets into portable on-chain reputation profiles using SNS identities, verified work, and composable trust.
          </p>
          <p className="text-sm text-white/30 max-w-md mb-8">
            SNS provides identity. TrustLayer provides trust. Together — composable infrastructure the ecosystem can build on.
          </p>

          {/* Phantom warning */}
          {!hasPhantom && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.08] animate-slide-up max-w-md">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-400">Phantom Not Detected</p>
                <p className="text-xs text-white/35 mt-0.5">
                  Install{" "}
                  <a href="https://phantom.app/" target="_blank" rel="noreferrer" className="text-amber-400 underline underline-offset-2 hover:text-amber-300">
                    Phantom
                  </a>{" "}to connect.
                </p>
              </div>
            </div>
          )}

          {/* Connect */}
          <WalletMultiButton />
          {connecting && (
            <p className="text-xs text-brand-400/50 animate-pulse mt-3">Waiting for wallet approval...</p>
          )}

          {/* Architecture flow */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs mt-10 mb-6">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.08] text-emerald-400/80 font-medium">
              SNS Identity
            </span>
            <ArrowRight className="w-3 h-3 text-white/15" />
            <span className="px-3 py-1.5 rounded-lg bg-brand-500/[0.06] border border-brand-500/[0.08] text-brand-400/80 font-medium">
              TrustLayer Reputation
            </span>
            <ArrowRight className="w-3 h-3 text-white/15" />
            <span className="px-3 py-1.5 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/[0.08] text-cyan-400/80 font-medium">
              Ecosystem Trust
            </span>
          </div>
        </div>
      </div>

      {/* Why TrustLayer Exists */}
      <section className="relative z-10 px-6 sm:px-8 pb-20 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="section-label mb-3">The problem</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">Web3 has a trust problem</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {PROBLEMS.map(({ title, desc, color, bg, border }) => (
            <div key={title} className={`p-6 rounded-xl ${bg} border ${border} transition-all duration-200 hover:border-white/[0.08]`}>
              <h3 className={`text-base font-semibold ${color} mb-1.5`}>{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-xs text-white/25 mb-2">The solution</p>
          <h3 className="text-xl font-bold text-white">TrustLayer solves this.</h3>
          <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
            Portable, verifiable, composable trust infrastructure for every Solana identity.
          </p>
        </div>
      </section>

      {/* Portable Reputation */}
      <section className="relative z-10 px-6 sm:px-8 pb-20 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="section-label mb-3">Composability</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">Portable Reputation Across Solana</h2>
          <p className="text-sm text-white/40 mt-2 max-w-lg mx-auto">
            Your trust should move with you — across DAOs, hackathons, hiring platforms, DeFi, and AI ecosystems.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ECOSYSTEM.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="glass-card-hover p-6 group">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border"
                style={{ background: `${color}08`, borderColor: `${color}15` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <h3 className="text-sm font-semibold text-white/80 mb-1">{title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              <p className="text-[10px] text-white/15 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                reads TrustLayer reputation
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Protocol Stats */}
      <section className="relative z-10 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-8 py-10">
          <div className="flex items-center justify-between">
            {protocolStats.map(({ label, value }, i) => (
              <div key={label} className="flex items-center">
                <div className="text-center px-6">
                  <p className="text-2xl font-bold text-white/90">{value}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1 font-medium">{label}</p>
                </div>
                {i < protocolStats.length - 1 && <div className="w-px h-8 bg-white/[0.04]" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-6 px-8 py-4 border-t border-white/[0.03]">
        <div className="flex items-center gap-2 text-xs text-white/25">
          <div className="w-1.5 h-1.5 rounded-full bg-trust-verified shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
          Solana Devnet
        </div>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-xs text-white/25 hover:text-white/40 transition-colors">
          GitHub
        </a>
        <a href="https://phantom.app" target="_blank" rel="noreferrer" className="text-xs text-white/25 hover:text-white/40 transition-colors flex items-center gap-1">
          Phantom <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
    };
  }
}
