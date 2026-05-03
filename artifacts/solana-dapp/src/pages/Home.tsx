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

          {/* Identity chip — shown once profile is known */}
          {connected && !loading && profile && (
            <div className="header-identity-chip">
              <span className="header-identity-dot" />
              <span className="header-identity-name">
                {profile.username}
                <span className="header-identity-suffix">.sol</span>
              </span>
            </div>
          )}

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

          /* ══ Disconnected: landing ══ */
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

          /* ══ Connected ══ */
          <div className="dashboard-layout">

            {/* ── Left sidebar ── */}
            <aside className="sidebar">

              {/* Identity card: username if profile loaded, wallet otherwise */}
              <div className="info-card sidebar-identity-card">
                {loading ? (
                  /* Checking PDA… */
                  <div className="sidebar-identity-checking">
                    <div className="sidebar-checking-spinner" />
                    <div>
                      <div className="info-label">Checking identity</div>
                      <div className="sidebar-checking-hint">Reading on-chain PDA…</div>
                    </div>
                  </div>
                ) : profile ? (
                  /* Profile exists: show username */
                  <>
                    <div className="info-label">Identity</div>
                    <div className="sidebar-username">
                      {profile.username}
                      <span className="sidebar-sol-suffix">.sol</span>
                    </div>
                    <div className="sidebar-wallet-addr mono">
                      {shortenAddress(publicKey!.toBase58(), 6)}
                    </div>
                    <div className="sidebar-verified-badge">
                      <span className="sidebar-verified-dot" />
                      On-chain identity verified
                    </div>
                  </>
                ) : (
                  /* No profile: show wallet address */
                  <>
                    <div className="info-label">Wallet</div>
                    <div className="address-short">{shortenAddress(publicKey!.toBase58())}</div>
                    <div className="address-full mono">{publicKey!.toBase58()}</div>
                    <div className="sidebar-no-identity-hint">
                      No identity found — create one below
                    </div>
                  </>
                )}
              </div>

              {/* Balance card */}
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

              {/* Checking PDA — full-panel loading state */}
              {loading && (
                <div className="identity-checking-panel">
                  <div className="identity-checking-ring">
                    <div className="identity-checking-spinner-lg" />
                    <span className="identity-checking-icon">◎</span>
                  </div>
                  <div className="identity-checking-text">
                    <p className="identity-checking-title">Verifying on-chain identity</p>
                    <p className="identity-checking-sub">
                      Checking for a profile PDA at seeds{" "}
                      <code>["profile", wallet]</code>
                    </p>
                  </div>
                </div>
              )}

              {/* ── No profile → Create Profile screen ── */}
              {!loading && !profile && <CreateProfile />}

              {/* ── Profile exists → Full dashboard ── */}
              {!loading && profile && (
                <>
                  <Dashboard />
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
