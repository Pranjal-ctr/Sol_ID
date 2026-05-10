import { NavLink, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import {
  LayoutDashboard,
  User,
  Upload,
  CheckCircle,
  History,
  Trophy,
  Globe,
  LogOut,
  Shield,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Trust Overview" },
  { to: "/profile", icon: User, label: "Identity Passport" },
  { to: "/submit", icon: Upload, label: "Submit Proof" },
  { to: "/verify", icon: CheckCircle, label: "Validate" },
  { to: "/history", icon: History, label: "Proof of Work" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/ecosystem", icon: Globe, label: "Ecosystem" },
];

function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function parseIdentity(username: string) {
  if (username.endsWith(".sol"))
    return { name: username.slice(0, -4), suffix: ".sol", isSns: true };
  if (username.endsWith(".tl"))
    return { name: username.slice(0, -3), suffix: ".tl", isSns: false };
  return { name: username, suffix: ".tl", isSns: false };
}

function getTier(score: number) {
  if (score >= 100) return { name: "Elite", color: "text-brand-400" };
  if (score >= 50) return { name: "Trusted", color: "text-emerald-400" };
  if (score >= 20) return { name: "Rising", color: "text-amber-400" };
  return { name: "Newcomer", color: "text-blue-400" };
}

export default function Sidebar() {
  const { publicKey, disconnect } = useWallet();
  const { profile } = useProgram();
  const location = useLocation();

  const identity = profile ? parseIdentity(profile.username) : null;
  const repScore = profile?.reputationScore ?? 0;
  const tier = getTier(repScore);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] z-30 flex flex-col border-r border-white/[0.04] bg-surface/90 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white/90">TrustLayer</h1>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-white/20">Protocol</span>
        </div>
      </div>

      {/* Identity section */}
      {profile && identity && (
        <div className="mx-4 mb-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-brand-500/10 flex items-center justify-center text-sm font-bold text-white">
              {identity.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {identity.name}
                <span className={identity.isSns ? "text-emerald-400" : "text-brand-400"}>
                  {identity.suffix}
                </span>
              </p>
              <p className="text-[10px] text-white/30 font-mono truncate">
                {publicKey ? shortenAddress(publicKey.toBase58(), 6) : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-brand-400" />
              <span className="text-xs font-bold neon-text">{repScore}</span>
              <span className="text-[10px] text-white/25">trust</span>
            </div>
            <span className={`text-[10px] font-bold ${tier.color} px-2 py-0.5 rounded bg-white/[0.03]`}>
              {tier.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-trust-verified shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
            <span className="text-[10px] text-trust-verified/70 font-medium">Identity verified</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="section-label px-4 mb-2">Navigation</p>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            >
              <Icon className="w-[16px] h-[16px]" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Wallet footer */}
      {publicKey && (
        <div className="px-4 py-4 border-t border-white/[0.04] space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-[9px] font-bold text-white">
              {publicKey.toBase58().slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-white/60 truncate">
                {shortenAddress(publicKey.toBase58(), 4)}
              </p>
              <p className="text-[9px] text-white/25">Connected</p>
            </div>
          </div>
          <button
            onClick={() => disconnect()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400/50 hover:text-red-400 hover:bg-red-500/[0.04] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </aside>
  );
}
