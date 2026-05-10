import { useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Toaster } from "react-hot-toast";

import "@solana/wallet-adapter-react-ui/styles.css";

import { useProgram } from "@/hooks/useProgram";
import { useSnsLookup } from "@/hooks/useSnsLookup";
import Layout from "@/components/layout/Layout";
import ConnectWallet from "@/components/ConnectWallet";
import CreateProfile from "@/pages/CreateProfile";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import SubmitWork from "@/pages/SubmitWork";
import VerifyWork from "@/pages/VerifyWork";
import WorkHistory from "@/pages/WorkHistory";
import Leaderboard from "@/pages/Leaderboard";
import EcosystemQuery from "@/pages/EcosystemQuery";

/**
 * AppGate — conditional rendering based on wallet + profile + SNS state.
 * Handles the full auth flow:
 *   No wallet  → Landing page
 *   SNS lookup → "Checking SNS identity…" spinner
 *   Loading    → "Verifying on-chain identity…" spinner
 *   No profile → CreateProfile (with SNS name or .tl fallback)
 *   Has profile → Dashboard
 */
function AppGate() {
  const { connected, publicKey } = useWallet();
  const { profile, loading } = useProgram();
  const { snsName, loading: snsLoading } = useSnsLookup(publicKey ?? null);

  // Not connected — show landing page
  if (!connected) return <ConnectWallet />;

  // SNS lookup or profile loading — cinematic identity sequence
  if (snsLoading || loading) {
    const step = snsLoading ? 1 : 2;
    const steps = [
      { label: "Wallet Connected", done: true },
      { label: "Resolving SNS Identity", done: step > 1 },
      { label: "Loading Trust Profile", done: false },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/[0.04] rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
          {/* Brand icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center animate-trust-pulse">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="absolute -inset-4 bg-brand-500/10 rounded-3xl blur-xl -z-10 animate-identity-glow" />
          </div>

          {/* Steps */}
          <div className="flex flex-col items-center gap-3">
            {steps.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i === step - 1 ? "opacity-100" : s.done ? "opacity-40" : "opacity-15"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${s.done ? "bg-trust-verified/20 text-trust-verified" : i === step - 1 ? "border border-brand-400/30 text-brand-400" : "border border-white/10 text-white/20"}`}>
                  {s.done ? "✓" : i === step - 1 ? <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" /> : (i + 1)}
                </div>
                <span className={`text-sm font-medium ${i === step - 1 ? "text-white" : s.done ? "text-white/50" : "text-white/20"}`}>
                  {s.label}{i === step - 1 ? "..." : ""}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-white/15">Connecting to Solana Devnet</p>
        </div>
      </div>
    );
  }

  // No profile → Create identity (pass snsName for prefill)
  if (!profile) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-brand-600/[0.06] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
          <CreateProfile snsName={snsName} />
        </div>
      </div>
    );
  }

  // Has profile → Full dashboard
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="submit" element={<SubmitWork />} />
        <Route path="verify" element={<VerifyWork />} />
        <Route path="history" element={<WorkHistory />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="ecosystem" element={<EcosystemQuery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  // Wallet Standard auto-detects Phantom and other compliant wallets.
  // Passing an empty array avoids duplicate adapter conflicts.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Routes>
            <Route path="/*" element={<AppGate />} />
          </Routes>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "rgba(22,22,31,0.95)",
                color: "#fff",
                border: "1px solid rgba(147,51,234,0.15)",
                backdropFilter: "blur(20px)",
                borderRadius: "14px",
                fontSize: "13px",
                padding: "12px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
