import { useState, useRef, useEffect, useCallback } from "react";
import { useProgram } from "@/hooks/useProgram";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { searchProfileByUsername } from "@/lib/program";
import toast from "react-hot-toast";
import {
  Shield,
  Sparkles,
  ExternalLink,
  Loader2,
  Globe,
  CheckCircle,
} from "lucide-react";

const USERNAME_RE = /^[a-z0-9-]+$/;
const MAX_LEN = 50;

function validate(raw: string): string | null {
  if (!raw) return null;
  if (raw.length > MAX_LEN) return `Too long — max ${MAX_LEN} characters.`;
  if (!USERNAME_RE.test(raw))
    return "Only lowercase letters, numbers, and hyphens.";
  if (raw.startsWith("-")) return "Cannot start with a hyphen.";
  if (raw.endsWith("-")) return "Cannot end with a hyphen.";
  return null;
}

/**
 * Extracts the display name and suffix from an identity string.
 * "alice.sol" → { name: "alice", suffix: ".sol", isSns: true }
 * "pranjal.tl" → { name: "pranjal", suffix: ".tl", isSns: false }
 */
function parseIdentity(identity: string) {
  if (identity.endsWith(".sol")) {
    return { name: identity.slice(0, -4), suffix: ".sol", isSns: true };
  }
  if (identity.endsWith(".tl")) {
    return { name: identity.slice(0, -3), suffix: ".tl", isSns: false };
  }
  return { name: identity, suffix: "", isSns: false };
}

interface CreateProfileProps {
  /** Resolved SNS .sol domain, e.g. "alice.sol". Null if no SNS found. */
  snsName: string | null;
}

export default function CreateProfile({ snsName }: CreateProfileProps) {
  const { callCreateProfile } = useProgram();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const inputRef = useRef<HTMLInputElement>(null);

  const [raw, setRaw] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<"idle" | "pending" | "success" | "error">(
    "idle"
  );
  const [sig, setSig] = useState("");
  const [createdIdentity, setCreatedIdentity] = useState("");
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SNS flow: username is locked to the SNS name
  const hasSns = !!snsName;
  const snsBaseName = hasSns ? parseIdentity(snsName!).name : "";

  // The username that will be stored on-chain
  const onChainUsername = hasSns ? snsName! : raw ? `${raw}.tl` : "";

  // Debounced username availability check
  useEffect(() => {
    if (hasSns || !raw || validate(raw)) {
      setUsernameTaken(false);
      setCheckingUsername(false);
      return;
    }
    if (!anchorWallet) return;

    setCheckingUsername(true);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await searchProfileByUsername(anchorWallet, connection, `${raw}.tl`);
        setUsernameTaken(result !== null);
      } catch {
        setUsernameTaken(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 600);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [raw, hasSns, anchorWallet, connection]);

  const validationError = touched ? validate(raw) : null;
  const canSubmit = hasSns
    ? phase !== "pending"
    : raw.length > 0 && !validate(raw) && !usernameTaken && !checkingUsername && phase !== "pending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPhase("pending");

    const result = await callCreateProfile(onChainUsername);
    if (result.status === "success") {
      setPhase("success");
      setSig(result.sig ?? "");
      setCreatedIdentity(onChainUsername);
      toast.success("Identity created on-chain");
    } else {
      setPhase("error");
      toast.error(result.error ?? "Transaction failed.");
      setTimeout(() => setPhase("idle"), 2000);
    }
  }

  if (phase === "success") {
    const parsed = parseIdentity(createdIdentity);
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <div className="glass-card p-10 text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Identity Created!
          </h2>
          <p className="text-xl font-bold neon-text mb-1">
            {parsed.name}
            <span className={parsed.isSns ? "text-emerald-400" : "text-brand-400"}>
              {parsed.suffix}
            </span>
          </p>
          {parsed.isSns && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/[0.08] px-3 py-1 rounded-full border border-emerald-500/20 mb-2">
              <Globe className="w-3 h-3" />
              SNS Verified
            </div>
          )}
          <p className="text-sm text-white/40 mb-6">
            Your profile is now live on Solana Devnet.
            {parsed.isSns
              ? " SNS identity linked to your TrustLayer reputation."
              : " TrustLayer identity created with portable reputation."}
          </p>
          {sig && (
            <a
              href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View transaction on Explorer
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="relative w-full max-w-lg">
        {/* Glow background */}
        <div className="absolute -inset-8 bg-brand-500/[0.08] rounded-3xl blur-2xl pointer-events-none" />

        <div className="glass-card relative p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Create your identity
              </h1>
              <p className="text-sm text-white/40 mt-1 leading-relaxed">
                {hasSns
                  ? "Your SNS domain was detected. Link it to TrustLayer to start building reputation."
                  : "Choose a TrustLayer username. No .sol domain required — we'll create a portable identity for you."}
              </p>
            </div>
          </div>

          {/* SNS Resolution Banner */}
          {hasSns ? (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">
                    SNS Identity Found
                  </p>
                  <p className="text-xl font-black text-white mt-0.5">
                    {snsBaseName}
                    <span className="text-emerald-400">.sol</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-3">
                Your SNS domain will be linked to your TrustLayer reputation
                profile. Identity provided by Solana Name Service.
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-brand-500/[0.04] border border-brand-500/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-400/60" />
                <p className="text-xs text-white/40">
                  No SNS domain detected for this wallet. Choose a TrustLayer
                  username below.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6">
              <label
                htmlFor="username-input"
                className="block text-sm font-semibold text-white/70 mb-2"
              >
                {hasSns ? "Identity" : "Choose a username"}
              </label>

              {hasSns ? (
                // SNS user: locked, pre-filled input
                <div className="flex items-center rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3.5">
                  <span className="text-base font-semibold text-white flex-1">
                    {snsBaseName}
                  </span>
                  <span className="text-emerald-400 font-semibold text-base">
                    .sol
                  </span>
                  <div className="ml-3 flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <CheckCircle className="w-3 h-3" />
                    SNS
                  </div>
                </div>
              ) : (
                // Non-SNS user: editable input with .tl suffix
                <>
                  <div
                    className={`
                      flex items-center rounded-xl border bg-surface-200/60 backdrop-blur-sm
                      transition-all duration-200
                      ${
                        validationError
                          ? "border-red-500/40 focus-within:ring-2 focus-within:ring-red-500/20"
                          : "border-white/[0.08] focus-within:border-brand-500/40 focus-within:ring-2 focus-within:ring-brand-500/20"
                      }
                    `}
                    onClick={() => inputRef.current?.focus()}
                  >
                    <input
                      id="username-input"
                      ref={inputRef}
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
                      }}
                      onBlur={() => setTouched(true)}
                      className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder-white/25 outline-none text-base"
                    />
                    <span className="pr-4 text-brand-400 font-semibold text-base">
                      .tl
                    </span>
                  </div>

                  {/* Hint row */}
                  <div className="flex items-center justify-between mt-2 px-1">
                    {validationError ? (
                      <span className="text-xs text-red-400">
                        {validationError}
                      </span>
                    ) : usernameTaken ? (
                      <span className="text-xs text-red-400">
                        {raw}.tl is already taken
                      </span>
                    ) : checkingUsername ? (
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Checking availability...
                      </span>
                    ) : raw ? (
                      <span className="text-xs text-emerald-400">
                        {raw}.tl is available
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">
                        Lowercase letters, numbers, hyphens · max {MAX_LEN}{" "}
                        chars
                      </span>
                    )}
                    <span className="text-xs text-white/20">
                      {raw.length}/{MAX_LEN}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {phase === "pending" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating identity…
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {hasSns
                    ? "Link SNS Identity to TrustLayer"
                    : "Create TrustLayer Identity"}
                </>
              )}
            </button>

            {/* What happens on-chain */}
            <div className="mt-6 p-4 rounded-xl bg-surface/40 border border-white/[0.04]">
              <p className="text-xs font-semibold text-white/40 mb-2">
                What happens on-chain
              </p>
              <ul className="space-y-1.5 text-xs text-white/30 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  A UserProfile PDA is created at seeds{" "}
                  <code className="text-brand-400/80 bg-brand-500/[0.08] px-1.5 py-0.5 rounded text-[11px] font-mono">
                    ["profile", wallet]
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  {hasSns
                    ? `Your SNS identity "${snsName}" is stored as the username`
                    : raw
                    ? `Your identity "${raw}.tl" is stored as the username`
                    : "Your chosen identity is stored as the username"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  Your wallet pays a small rent-exempt deposit (~0.002 SOL)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  Reputation (0) and work count (0) are initialized
                </li>
              </ul>
            </div>

            {/* Identity architecture note */}
            <div className="mt-4 p-3 rounded-xl bg-surface/40 border border-white/[0.04] flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-white/20 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-white/30">
                {hasSns
                  ? "SNS provides your identity. TrustLayer stores your reputation. Together, they create a composable trust layer for the Solana ecosystem."
                  : "TrustLayer identities (.tl) work like .sol domains but are free and include built-in reputation. Upgrade to a .sol domain anytime via SNS."}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
