import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import CreateProfile from "@/components/CreateProfile";
import Dashboard from "@/components/Dashboard";
import SubmitWork from "@/components/SubmitWork";
import ReviewWork from "@/components/ReviewWork";

function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default function Home() {
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const { connection } = useConnection();
  const { profile, loading } = useProgram();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) { setBalance(null); return; }
    let cancelled = false;
    connection.getBalance(publicKey).then((lamps) => {
      if (!cancelled) setBalance(lamps / LAMPORTS_PER_SOL);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [publicKey, connected, connection]);

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">◎</span>
          <span className="logo-text">SolID</span>
        </div>
        <div className="header-right">
          <div className="network-badge">Devnet</div>
          {connected && (
            <button className="disconnect-btn-sm" onClick={() => disconnect()}>
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main app-main-wide">
        {!connected ? (
          /* ── Disconnected state ── */
          <div className="connect-panel">
            <div className="hero-icon">◎</div>
            <h1 className="hero-title">Decentralized Identity</h1>
            <p className="hero-sub">
              Connect your Phantom wallet to access your on-chain identity and
              reputation profile.
            </p>
            <WalletMultiButton className="wallet-btn-custom" />
            {connecting && <p className="connecting-hint">Waiting for wallet approval…</p>}
          </div>
        ) : (
          /* ── Connected state ── */
          <div className="dashboard-layout">

            {/* ── Left sidebar: wallet info ── */}
            <aside className="sidebar">
              <div className="info-card">
                <div className="info-label">Wallet</div>
                <div className="address-short">{shortenAddress(publicKey!.toBase58())}</div>
                <div className="address-full mono">{publicKey!.toBase58()}</div>
              </div>

              <div className="info-card">
                <div className="info-label">Balance</div>
                <div className="balance-amount">
                  {balance !== null ? (
                    <>
                      <span className="balance-number">{balance.toFixed(4)}</span>
                      <span className="balance-unit">SOL</span>
                    </>
                  ) : (
                    <span className="loading-dots">···</span>
                  )}
                </div>
                <div className="network-label">Solana Devnet</div>
              </div>

              <WalletMultiButton className="wallet-btn-custom wallet-btn-sm" />
            </aside>

            {/* ── Right column: program UI ── */}
            <div className="main-panels">

              {/* Loading: fetching PDA from chain */}
              {loading && (
                <div className="loading-state">
                  <span className="loading-dots">···</span>
                  <span>Fetching on-chain data…</span>
                </div>
              )}

              {/* No profile yet: show Create Profile form */}
              {!loading && !profile && <CreateProfile />}

              {/* Profile exists: show full dashboard */}
              {!loading && profile && (
                <>
                  {/* Identity & reputation overview */}
                  <Dashboard />

                  {/* Work submission and review */}
                  <SubmitWork />
                  <ReviewWork />
                </>
              )}

            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        Identity &amp; Reputation · Solana Devnet
      </footer>
    </div>
  );
}
