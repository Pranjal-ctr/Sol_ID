import { useState, useRef } from "react";
import { useProgram } from "@/hooks/useProgram";

const USERNAME_RE = /^[a-z0-9-]+$/;
const MAX_LEN = 50;

function validate(raw: string): string | null {
  if (!raw) return null;
  if (raw.length > MAX_LEN) return `Too long — max ${MAX_LEN} characters.`;
  if (!USERNAME_RE.test(raw)) return "Only lowercase letters, numbers, and hyphens.";
  if (raw.startsWith("-")) return "Cannot start with a hyphen.";
  if (raw.endsWith("-")) return "Cannot end with a hyphen.";
  return null;
}

export default function CreateProfile() {
  const { callCreateProfile } = useProgram();
  const inputRef = useRef<HTMLInputElement>(null);

  const [raw, setRaw] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [sig, setSig] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const validationError = touched ? validate(raw) : null;
  const canSubmit = raw.length > 0 && !validate(raw) && phase !== "pending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPhase("pending");
    setErrMsg("");
    const result = await callCreateProfile(raw);
    if (result.status === "success") {
      setPhase("success");
      setSig(result.sig ?? "");
    } else {
      setPhase("error");
      setErrMsg(result.error ?? "Transaction failed.");
    }
  }

  if (phase === "success") {
    return (
      <div className="cp-wrap">
        <div className="cp-success-screen">
          <div className="cp-success-ring">
            <span className="cp-success-check">✓</span>
          </div>
          <h2 className="cp-success-title">Identity created</h2>
          <p className="cp-success-name">{raw}<span className="cp-sol-suffix">.sol</span></p>
          <p className="cp-success-sub">Your profile is now live on Solana Devnet.</p>
          <a
            className="cp-explorer-link"
            href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction on Explorer ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-wrap">
      <div className="cp-glow" aria-hidden />
      <div className="cp-card">
        <div className="cp-header">
          <div className="cp-logo-ring">◎</div>
          <div>
            <h1 className="cp-title">Create your identity</h1>
            <p className="cp-subtitle">
              Claim a username stored on-chain as a Solana PDA — permanent,
              wallet-bound, and reputation-linked.
            </p>
          </div>
        </div>

        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          <div className="cp-field">
            <label className="cp-label" htmlFor="username-input">
              Choose a username
            </label>
            <div
              className={[
                "cp-input-wrap",
                validationError ? "cp-input-wrap--error" : "",
                phase === "pending" ? "cp-input-wrap--disabled" : "",
              ].join(" ")}
              onClick={() => inputRef.current?.focus()}
            >
              <input
                id="username-input"
                ref={inputRef}
                className="cp-input"
                type="text"
                placeholder="yourname"
                maxLength={MAX_LEN}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={raw}
                disabled={phase === "pending"}
                onChange={(e) => {
                  setRaw(e.target.value.toLowerCase());
                  setTouched(true);
                  if (phase === "error") setPhase("idle");
                }}
                onBlur={() => setTouched(true)}
              />
              <span className="cp-suffix">.sol</span>
            </div>
            <div className="cp-hint-row">
              {validationError ? (
                <span className="cp-hint cp-hint--error">{validationError}</span>
              ) : raw ? (
                <span className="cp-hint cp-hint--ok">✓ {raw}.sol — looks good</span>
              ) : (
                <span className="cp-hint">Lowercase letters, numbers, hyphens · max {MAX_LEN} chars</span>
              )}
              <span className="cp-char-count">{raw.length}/{MAX_LEN}</span>
            </div>
          </div>

          <button
            className="cp-btn"
            type="submit"
            disabled={!canSubmit}
            aria-busy={phase === "pending"}
          >
            {phase === "pending" ? (
              <span className="cp-btn-inner">
                <span className="cp-spinner" />
                Creating identity…
              </span>
            ) : (
              <span className="cp-btn-inner">
                <span className="cp-btn-icon">◎</span>
                Create Profile
              </span>
            )}
          </button>

          {phase === "error" && (
            <div className="toast toast--error">
              <span className="toast-icon">⚠</span>
              <span>{errMsg}</span>
            </div>
          )}

          <div className="cp-what-happens">
            <p className="cp-wh-title">What happens on-chain</p>
            <ul className="cp-wh-list">
              <li>A UserProfile PDA is created at seeds <code>["profile", wallet]</code></li>
              <li>Your wallet pays a small rent-exempt deposit (~0.002 SOL)</li>
              <li>Username, reputation score (0), and work count (0) are stored</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
