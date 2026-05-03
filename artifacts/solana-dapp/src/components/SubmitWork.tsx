/**
 * SubmitWork — lets a connected user submit a work record on-chain.
 *
 * Calls submitWork(job_id, proof_link) which creates a WorkRecord PDA at
 * seeds ["work", profilePda, job_id]. Submitting the same job_id twice
 * fails at the PDA level (account already exists).
 */

import { useState, useRef } from "react";
import { useProgram } from "@/hooks/useProgram";

type Phase = "idle" | "pending" | "success" | "error";

function ExplorerLink({ sig }: { sig: string }) {
  return (
    <a
      className="sw-explorer-link"
      href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
    >
      View on Explorer ↗
    </a>
  );
}

export default function SubmitWork() {
  const { callSubmitWork, loading } = useProgram();

  const [jobId,     setJobId]     = useState("");
  const [proofLink, setProofLink] = useState("");
  const [phase,     setPhase]     = useState<Phase>("idle");
  const [sig,       setSig]       = useState("");
  const [errMsg,    setErrMsg]    = useState("");
  const [lastJob,   setLastJob]   = useState("");

  const jobRef   = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const busy     = phase === "pending" || loading;
  const canSubmit = jobId.trim().length > 0 && proofLink.trim().length > 0 && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const jid = jobId.trim();
    const pl  = proofLink.trim();
    setPhase("pending");
    setErrMsg("");
    setSig("");

    const result = await callSubmitWork(jid, pl);

    if (result.status === "success") {
      setLastJob(jid);
      setPhase("success");
      setSig(result.sig ?? "");
      setJobId("");
      setProofLink("");
      jobRef.current?.focus();
    } else {
      setPhase("error");
      setErrMsg(result.error ?? "Transaction failed.");
    }
  }

  function handleChange() {
    if (phase === "error" || phase === "success") setPhase("idle");
  }

  return (
    <div className="sw-card">
      {/* ── Header ── */}
      <div className="sw-header">
        <div className="sw-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <h2 className="sw-title">Submit Work</h2>
          <p className="sw-subtitle">Create an on-chain work record tied to your profile PDA</p>
        </div>
      </div>

      {/* ── Form ── */}
      <form className="sw-form" onSubmit={handleSubmit} noValidate>

        {/* Job ID */}
        <div className="sw-field">
          <label className="sw-label" htmlFor="sw-job-id">
            Job ID
            <span className="sw-label-hint">unique per profile</span>
          </label>
          <div className="sw-input-row">
            <span className="sw-input-prefix">#</span>
            <input
              id="sw-job-id"
              ref={jobRef}
              className="sw-input sw-input--prefixed"
              type="text"
              placeholder="job-2024-001"
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              value={jobId}
              disabled={busy}
              onChange={(e) => { setJobId(e.target.value); handleChange(); }}
            />
          </div>
          <span className="sw-field-note">
            Seeds: <code>["work", profilePda, job_id]</code> · must be unique
          </span>
        </div>

        {/* Proof Link */}
        <div className="sw-field">
          <label className="sw-label" htmlFor="sw-proof-link">
            Proof Link
            <span className="sw-label-hint">public URL stored on-chain</span>
          </label>
          <input
            id="sw-proof-link"
            ref={proofRef}
            className="sw-input"
            type="url"
            placeholder="https://arweave.net/abc123..."
            maxLength={200}
            value={proofLink}
            disabled={busy}
            onChange={(e) => { setProofLink(e.target.value); handleChange(); }}
          />
          <span className="sw-field-note">IPFS, Arweave, GitHub, or any verifiable URL</span>
        </div>

        {/* Submit button */}
        <button className="sw-btn" type="submit" disabled={!canSubmit} aria-busy={busy}>
          {phase === "pending" ? (
            <span className="sw-btn-inner">
              <span className="sw-spinner" />
              Sending transaction…
            </span>
          ) : (
            <span className="sw-btn-inner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
                <path d="M5 21h14"/>
              </svg>
              Submit Work
            </span>
          )}
        </button>

        {/* ── Status feedback ── */}
        {phase === "success" && (
          <div className="sw-status sw-status--success">
            <div className="sw-status-icon sw-status-icon--success">✓</div>
            <div className="sw-status-body">
              <p className="sw-status-title">Work record created on-chain</p>
              <p className="sw-status-meta">
                Job <code>{lastJob}</code> · WorkRecord PDA initialised
              </p>
              <ExplorerLink sig={sig} />
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="sw-status sw-status--error">
            <div className="sw-status-icon sw-status-icon--error">⚠</div>
            <div className="sw-status-body">
              <p className="sw-status-title">Transaction failed</p>
              <p className="sw-status-meta">{errMsg}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
