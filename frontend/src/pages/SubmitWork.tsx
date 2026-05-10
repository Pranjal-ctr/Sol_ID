import { useState, useRef } from "react";
import { useProgram } from "@/hooks/useProgram";
import toast from "react-hot-toast";
import {
  Upload,
  ExternalLink,
  Loader2,
  Hash,
  Link as LinkIcon,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function SubmitWork() {
  const { callSubmitWork, loading } = useProgram();
  const [jobId, setJobId] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [phase, setPhase] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [sig, setSig] = useState("");
  const [lastJob, setLastJob] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const jobRef = useRef<HTMLInputElement>(null);

  const busy = phase === "pending" || loading;
  const jobIdTooLong = new TextEncoder().encode(jobId.trim()).length > 32;
  const canSubmit =
    jobId.trim().length > 0 &&
    !jobIdTooLong &&
    proofLink.trim().length > 0 &&
    !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase("pending");
    setErrorMsg("");

    const result = await callSubmitWork(jobId.trim(), proofLink.trim());

    if (result.status === "success") {
      setLastJob(jobId.trim());
      setPhase("success");
      setSig(result.sig ?? "");
      setJobId("");
      setProofLink("");
      toast.success("Work submitted on-chain");
      jobRef.current?.focus();
    } else {
      setPhase("error");
      const err = result.error ?? "Transaction failed";
      setErrorMsg(
        err.includes("already in use")
          ? `Job ID "${jobId.trim()}" already exists on your profile. Use a unique ID.`
          : err.includes("max seed length")
          ? "Job ID too long for PDA seed (max 32 bytes). Use a shorter ID."
          : err
      );
      toast.error("Submission failed");
    }
  }

  function handleChange() {
    if (phase === "error" || phase === "success") {
      setPhase("idle");
      setErrorMsg("");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Submit Proof</h1>
        <p className="text-sm text-white/30 mt-0.5">
          Create an on-chain proof record tied to your identity
        </p>
      </div>

      <div className="glass-card p-8 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/15 to-blue-500/15 border border-brand-500/[0.08] flex items-center justify-center">
            <Upload className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white/80">New Proof Record</h2>
            <p className="text-xs text-white/30">Stored as a WorkRecord PDA on Solana</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Job ID */}
          <div>
            <label htmlFor="sw-job-id" className="block text-sm font-semibold text-white/70 mb-2">
              Job ID <span className="text-white/30 font-normal">— unique per profile</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                id="sw-job-id"
                ref={jobRef}
                type="text"
                placeholder="project-alpha"
                maxLength={32}
                autoComplete="off"
                spellCheck={false}
                value={jobId}
                disabled={busy}
                onChange={(e) => { setJobId(e.target.value); handleChange(); }}
                className="input-field pl-10"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              {jobIdTooLong ? (
                <p className="text-xs text-red-400">Max 32 characters (PDA seed limit)</p>
              ) : (
                <p className="text-xs text-white/20">
                  Seeds: <code className="text-brand-400/60 bg-brand-500/[0.06] px-1 rounded font-mono text-[11px]">["work", profile, job_id]</code>
                </p>
              )}
              <span className="text-xs text-white/30">{jobId.length}/32</span>
            </div>
          </div>

          {/* Proof Link */}
          <div>
            <label htmlFor="sw-proof-link" className="block text-sm font-semibold text-white/70 mb-2">
              Proof Link <span className="text-white/30 font-normal">— public URL stored on-chain</span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                id="sw-proof-link"
                type="url"
                placeholder="https://github.com/user/repo"
                maxLength={200}
                value={proofLink}
                disabled={busy}
                onChange={(e) => { setProofLink(e.target.value); handleChange(); }}
                className="input-field pl-10"
              />
            </div>
            <p className="text-xs text-white/30 mt-1.5 px-1">
              IPFS, Arweave, GitHub, or any verifiable URL
            </p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={!canSubmit} className="btn-primary w-full flex items-center justify-center gap-2">
            {phase === "pending" ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Sending transaction…</>
            ) : (
              <><Upload className="w-4 h-4" />Submit Work</>
            )}
          </button>

          {/* Success */}
          {phase === "success" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 animate-slide-up">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">Proof record created</p>
                <p className="text-xs text-white/30 mt-0.5">
                  Job <code className="text-white/60">{lastJob}</code> — PDA initialized
                </p>
                {sig && (
                  <a href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                    <ExternalLink className="w-3 h-3" />View on Explorer
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Error with detailed message */}
          {phase === "error" && errorMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20 animate-slide-up">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-400">Submission failed</p>
                <p className="text-xs text-white/40 mt-0.5">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => { setPhase("idle"); setErrorMsg(""); }}
                  className="text-xs text-brand-400 hover:text-brand-300 mt-2 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-xl bg-surface/40 border border-white/[0.04]">
          <p className="text-xs font-semibold text-white/40 mb-2">How it works</p>
          <ul className="space-y-1.5 text-xs text-white/30 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-brand-400 mt-0.5">1</span>
              A unique WorkRecord PDA is created from your profile + job ID
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400 mt-0.5">2</span>
              The proof link is stored on-chain as verifiable evidence
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400 mt-0.5">3</span>
              Another user can verify or reject your work to update your reputation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
