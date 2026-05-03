import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default function Home() {
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    setLoadingBalance(true);

    connection.getBalance(publicKey).then((lamports) => {
      if (!cancelled) {
        setBalance(lamports / LAMPORTS_PER_SOL);
        setLoadingBalance(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingBalance(false);
    });

    return () => { cancelled = true; };
  }, [publicKey, connected, connection]);

  return (
    <div className="app-shell">
      {/* ── Header ───────────────────────────────────── */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">◎</span>
          <span className="logo-text">SolID</span>
        </div>
        <div className="network-badge">Devnet</div>
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <main className="app-main">
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
            {connecting && (
              <p className="connecting-hint">Waiting for wallet approval…</p>
            )}
          </div>
        ) : (
          /* ── Connected state ── */
          <div className="wallet-panel">
            {/* Status pill */}
            <div className="status-pill">
              <span className="status-dot" />
              Connected
            </div>

            {/* Address card */}
            <div className="info-card">
              <div className="info-label">Wallet Address</div>
              <div className="address-full">{publicKey!.toBase58()}</div>
              <div className="address-short">
                {shortenAddress(publicKey!.toBase58())}
              </div>
            </div>

            {/* Balance card */}
            <div className="info-card">
              <div className="info-label">Balance</div>
              <div className="balance-amount">
                {loadingBalance ? (
                  <span className="loading-dots">···</span>
                ) : balance !== null ? (
                  <>
                    <span className="balance-number">
                      {balance.toFixed(4)}
                    </span>
                    <span className="balance-unit">SOL</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="network-label">Solana Devnet</div>
            </div>

            {/* Actions */}
            <div className="action-row">
              <WalletMultiButton className="wallet-btn-custom wallet-btn-sm" />
              <button className="disconnect-btn" onClick={() => disconnect()}>
                Disconnect
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="app-footer">
        Identity &amp; Reputation · Solana Devnet
      </footer>
    </div>
  );
}
