import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import CreateProfile from "@/components/CreateProfile";
import Dashboard from "@/components/Dashboard";

function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function TxLink({ sig }: { sig: string }) {
  return (
    <a
      className="tx-link"
      href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
    >
      View on Explorer ↗
    </a>
  );
}

// ── Submit Work ───────────────────────────────────────────────────────────────

function SubmitWorkPanel() {
  const { callSubmitWork, loading } = useProgram();
  const [jobId, setJobId]           = useState("");
  const [proofLink, setProofLink]   = useState("");
  const [status, setStatus]         = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage]       = useState("");
  const [sig, setSig]               = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId.trim() || !proofLink.trim()) return;
    setStatus("pending");
    setMessage("");
    const result = await callSubmitWork(jobId.trim(), proofLink.trim());
    if (result.status === "success") {
      setStatus("success");
      setSig(result.sig ?? "");
      setMessage("Work record created on-chain!");
      setJobId("");
      setProofLink("");
    } else {
      setStatus("error");
      setMessage(result.error ?? "Unknown error");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">⬆</span>
        <h2 className="panel-title">Submit Work</h2>
      </div>
      <p className="panel-desc">
        Submit a job record with a proof link. Each job ID can only be submitted
        once per profile — enforced at the PDA level.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Job ID</label>
          <input
            className="field-input"
            placeholder="job-001"
            maxLength={50}
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            disabled={status === "pending" || loading}
          />
        </div>
        <div className="field">
          <label className="field-label">Proof Link</label>
          <input
            className="field-input"
            placeholder="https://arweave.net/abc123..."
            maxLength={200}
            value={proofLink}
            onChange={(e) => setProofLink(e.target.value)}
            disabled={status === "pending" || loading}
          />
          <span className="field-hint">IPFS, Arweave, or any public URL</span>
        </div>
        <button
          className="btn-primary"
          type="submit"
          disabled={!jobId.trim() || !proofLink.trim() || status === "pending" || loading}
        >
          {status === "pending" ? "Sending transaction…" : "Submit Work"}
        </button>
        {status === "success" && (
          <div className="tx-success">{message} <TxLink sig={sig} /></div>
        )}
        {status === "error" && (
          <div className="tx-error">{message}</div>
        )}
      </form>
    </div>
  );
}

// ── Work Records ──────────────────────────────────────────────────────────────

function WorkRecordRow({
  record,
  ownerKey,
}: {
  record: { jobId: string; proofLink: string; verified: boolean };
  ownerKey: string;
}) {
  const { callVerifyWork, callRejectWork } = useProgram();
  const [status, setStatus] = useState<"idle" | "pending">("idle");
  const [result, setResult] = useState<{ ok: boolean; sig?: string; error?: string } | null>(null);

  async function handleVerify() {
    setStatus("pending");
    setResult(null);
    const r = await callVerifyWork(new PublicKey(ownerKey), record.jobId);
    setStatus("idle");
    setResult({ ok: r.status === "success", sig: r.sig, error: r.error });
  }

  async function handleReject() {
    setStatus("pending");
    setResult(null);
    const r = await callRejectWork(new PublicKey(ownerKey), record.jobId);
    setStatus("idle");
    setResult({ ok: r.status === "success", sig: r.sig, error: r.error });
  }

  const busy = status === "pending";

  return (
    <div className={`work-row ${record.verified ? "work-row-verified" : ""}`}>
      <div className="work-row-top">
        <div className="work-job-id">{record.jobId}</div>
        {record.verified ? (
          <span className="badge-verified">Verified</span>
        ) : (
          <span className="badge-pending">Pending</span>
        )}
      </div>
      <a
        className="work-proof"
        href={record.proofLink}
        target="_blank"
        rel="noreferrer"
        title={record.proofLink}
      >
        {record.proofLink.length > 52 ? record.proofLink.slice(0, 52) + "…" : record.proofLink}
      </a>
      {!record.verified && (
        <div className="work-actions">
          <button className="btn-verify" onClick={handleVerify} disabled={busy} title="Verify — adds +10 reputation">
            {busy ? "…" : "✓ Verify +10"}
          </button>
          <button className="btn-reject" onClick={handleReject} disabled={busy} title="Reject — subtracts -5 reputation">
            {busy ? "…" : "✕ Reject −5"}
          </button>
        </div>
      )}
      {result && (
        result.ok ? (
          <div className="tx-success-sm">Done! <TxLink sig={result.sig!} /></div>
        ) : (
          <div className="tx-error-sm">{result.error}</div>
        )
      )}
    </div>
  );
}

function WorkRecordsPanel() {
  const { workRecords, profile, wallet } = useProgram();
  if (!profile) return null;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">📋</span>
        <h2 className="panel-title">Work Records</h2>
        <span className="panel-count">{workRecords.length}</span>
      </div>
      {workRecords.length === 0 ? (
        <p className="panel-empty">No work submitted yet. Use the form above to submit your first job.</p>
      ) : (
        <div className="work-list">
          {workRecords.map((r) => (
            <WorkRecordRow
              key={r.jobId}
              record={r}
              ownerKey={wallet!.publicKey.toBase58()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
          /* ── Disconnected ── */
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
          /* ── Connected ── */
          <div className="dashboard-layout">
            {/* Left sidebar — wallet info */}
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
                  ) : <span className="loading-dots">···</span>}
                </div>
                <div className="network-label">Solana Devnet</div>
              </div>

              <WalletMultiButton className="wallet-btn-custom wallet-btn-sm" />
            </aside>

            {/* Right column — program UI */}
            <div className="main-panels">
              {loading && (
                <div className="loading-state">
                  <span className="loading-dots">···</span>
                  <span>Fetching on-chain data…</span>
                </div>
              )}

              {/* Create Profile — shown until a profile exists */}
              {!loading && !profile && <CreateProfile />}

              {/* Dashboard — shown once profile is loaded */}
              {!loading && profile && (
                <>
                  <Dashboard />
                  <SubmitWorkPanel />
                  <WorkRecordsPanel />
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
