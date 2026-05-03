/**
 * ReviewWork — lets the connected wallet act as a verifier for any WorkRecord.
 *
 * The caller signs as the `verifier` account on either:
 *   - verifyWork()  → sets verified=true, reputation_score += 10
 *   - rejectWork()  → sets verified=false (stays), reputation_score -= 5 (floor 0)
 *
 * PDA flow for both:
 *   profilePda  = ["profile", profileOwnerKey]
 *   workPda     = ["work", profilePda, job_id]
 * The `verifier` in this demo is the connected wallet itself.
 *
 * In a production system you would restrict `verifier` to a known authority
 * stored in a Config PDA — anyone can call it here for demo purposes.
 */

import { useState, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";

type ActionPhase = "idle" | "pending" | "success" | "error";

interface ActionState {
  phase:  ActionPhase;
  sig:    string;
  errMsg: string;
}

const IDLE: ActionState = { phase: "idle", sig: "", errMsg: "" };

function ExplorerLink({ sig }: { sig: string }) {
  return (
    <a
      className="rw-explorer-link"
      href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
    >
      View on Explorer ↗
    </a>
  );
}

function StatusBlock({
  action,
  state,
}: {
  action: "verify" | "reject";
  state: ActionState;
}) {
  if (state.phase === "idle") return null;

  if (state.phase === "pending") {
    return (
      <div className={`rw-status rw-status--pending rw-status--${action}`}>
        <span className="rw-spinner" />
        <span>
          {action === "verify" ? "Verifying work record…" : "Rejecting work record…"}
        </span>
      </div>
    );
  }

  if (state.phase === "success") {
    return (
      <div className={`rw-status rw-status--success rw-status--${action}`}>
        <span className="rw-status-icon">
          {action === "verify" ? "✓" : "✕"}
        </span>
        <div className="rw-status-body">
          <span className="rw-status-title">
            {action === "verify"
              ? "Work verified — reputation +10"
              : "Work rejected — reputation −5"}
          </span>
          <ExplorerLink sig={state.sig} />
        </div>
      </div>
    );
  }

  // error
  return (
    <div className={`rw-status rw-status--error rw-status--${action}`}>
      <span className="rw-status-icon">⚠</span>
      <div className="rw-status-body">
        <span className="rw-status-title">Transaction failed</span>
        <span className="rw-status-meta">{state.errMsg}</span>
      </div>
    </div>
  );
}

export default function ReviewWork() {
  const { callVerifyWork, callRejectWork, wallet, profile } = useProgram();
  const inputRef = useRef<HTMLInputElement>(null);

  const [jobId,      setJobId]      = useState("");
  const [ownerKey,   setOwnerKey]   = useState("");
  const [verifyState, setVerify]    = useState<ActionState>(IDLE);
  const [rejectState, setReject]    = useState<ActionState>(IDLE);
  const [keyError,    setKeyError]  = useState("");

  const anyBusy = verifyState.phase === "pending" || rejectState.phase === "pending";

  // Pre-fill owner key with connected wallet (most common use case in demo)
  function handleFocusOwner(e: React.FocusEvent<HTMLInputElement>) {
    if (!e.target.value && wallet?.publicKey) {
      setOwnerKey(wallet.publicKey.toBase58());
    }
  }

  function validateOwnerKey(key: string): PublicKey | null {
    try {
      return new PublicKey(key);
    } catch {
      return null;
    }
  }

  function resetStatus() {
    if (verifyState.phase !== "idle") setVerify(IDLE);
    if (rejectState.phase !== "idle") setReject(IDLE);
    setKeyError("");
  }

  async function handleVerify() {
    if (anyBusy || !jobId.trim()) return;
    const pk = validateOwnerKey(ownerKey.trim());
    if (!pk) { setKeyError("Invalid wallet address."); return; }
    setKeyError("");
    setVerify({ phase: "pending", sig: "", errMsg: "" });
    setReject(IDLE);
    const r = await callVerifyWork(pk, jobId.trim());
    if (r.status === "success") {
      setVerify({ phase: "success", sig: r.sig ?? "", errMsg: "" });
    } else {
      setVerify({ phase: "error", sig: "", errMsg: r.error ?? "Unknown error" });
    }
  }

  async function handleReject() {
    if (anyBusy || !jobId.trim()) return;
    const pk = validateOwnerKey(ownerKey.trim());
    if (!pk) { setKeyError("Invalid wallet address."); return; }
    setKeyError("");
    setReject({ phase: "pending", sig: "", errMsg: "" });
    setVerify(IDLE);
    const r = await callRejectWork(pk, jobId.trim());
    if (r.status === "success") {
      setReject({ phase: "success", sig: r.sig ?? "", errMsg: "" });
    } else {
      setReject({ phase: "error", sig: "", errMsg: r.error ?? "Unknown error" });
    }
  }

  const canAct = jobId.trim().length > 0 && ownerKey.trim().length > 0 && !anyBusy;

  return (
    <div className="rw-card">
      {/* ── Header ── */}
      <div className="rw-header">
        <div className="rw-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div>
          <h2 className="rw-title">Review Work</h2>
          <p className="rw-subtitle">Verify or reject a submitted work record as a trusted reviewer</p>
        </div>
      </div>

      {/* ── Reputation legend ── */}
      <div className="rw-legend">
        <div className="rw-legend-item rw-legend-item--verify">
          <span className="rw-legend-icon">✓</span>
          <div>
            <span className="rw-legend-label">Verify</span>
            <span className="rw-legend-value">+10 reputation</span>
          </div>
        </div>
        <div className="rw-legend-sep" />
        <div className="rw-legend-item rw-legend-item--reject">
          <span className="rw-legend-icon">✕</span>
          <div>
            <span className="rw-legend-label">Reject</span>
            <span className="rw-legend-value">−5 reputation (min 0)</span>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="rw-form">

        {/* Profile owner key */}
        <div className="rw-field">
          <label className="rw-label" htmlFor="rw-owner">
            Profile Owner Wallet
            {wallet?.publicKey && (
              <button
                type="button"
                className="rw-autofill-btn"
                onClick={() => { setOwnerKey(wallet.publicKey.toBase58()); resetStatus(); }}
              >
                Use mine
              </button>
            )}
          </label>
          <input
            id="rw-owner"
            className={["rw-input rw-input--mono", keyError ? "rw-input--error" : ""].join(" ")}
            type="text"
            placeholder="Wallet pubkey of the profile to review"
            value={ownerKey}
            disabled={anyBusy}
            onFocus={handleFocusOwner}
            onChange={(e) => { setOwnerKey(e.target.value); resetStatus(); }}
          />
          {keyError && <span className="rw-field-error">{keyError}</span>}
          <span className="rw-field-note">
            PDA derived as <code>["profile", this wallet]</code>
          </span>
        </div>

        {/* Job ID */}
        <div className="rw-field">
          <label className="rw-label" htmlFor="rw-job-id">
            Job ID
          </label>
          <div className="rw-input-row">
            <span className="rw-input-prefix">#</span>
            <input
              id="rw-job-id"
              ref={inputRef}
              className="rw-input rw-input--prefixed"
              type="text"
              placeholder="job-2024-001"
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              value={jobId}
              disabled={anyBusy}
              onChange={(e) => { setJobId(e.target.value); resetStatus(); }}
            />
          </div>
          <span className="rw-field-note">
            WorkRecord PDA: <code>["work", profilePda, job_id]</code>
          </span>
        </div>

        {/* Action buttons */}
        <div className="rw-actions">
          <button
            className="rw-btn rw-btn--verify"
            type="button"
            disabled={!canAct}
            aria-busy={verifyState.phase === "pending"}
            onClick={handleVerify}
          >
            {verifyState.phase === "pending" ? (
              <span className="rw-btn-inner">
                <span className="rw-spinner rw-spinner--light" />
                Verifying…
              </span>
            ) : (
              <span className="rw-btn-inner">
                <span className="rw-btn-check">✓</span>
                Verify Work
                <span className="rw-btn-delta">+10</span>
              </span>
            )}
          </button>

          <button
            className="rw-btn rw-btn--reject"
            type="button"
            disabled={!canAct}
            aria-busy={rejectState.phase === "pending"}
            onClick={handleReject}
          >
            {rejectState.phase === "pending" ? (
              <span className="rw-btn-inner">
                <span className="rw-spinner rw-spinner--light" />
                Rejecting…
              </span>
            ) : (
              <span className="rw-btn-inner">
                <span className="rw-btn-x">✕</span>
                Reject Work
                <span className="rw-btn-delta">−5</span>
              </span>
            )}
          </button>
        </div>

        {/* Status blocks */}
        <StatusBlock action="verify" state={verifyState} />
        <StatusBlock action="reject" state={rejectState} />

        {/* Info note */}
        <div className="rw-info-note">
          <span className="rw-info-dot">ℹ</span>
          <span>
            Already-verified records cannot be re-reviewed — the program will return{" "}
            <code>AlreadyVerified</code> (error 6003).
          </span>
        </div>
      </div>
    </div>
  );
}
