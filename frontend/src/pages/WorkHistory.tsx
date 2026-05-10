import { useProgram } from "@/hooks/useProgram";
import { getProfilePda } from "@/lib/program";
import {
  resolveWorkStatus,
  WorkStatus,
  getStatusLabel,
  getStatusColor,
  getVerifierMeta,
} from "@/lib/trustConfig";
import { CheckCircle, Clock, XCircle, ExternalLink, FileText, RefreshCw, Shield } from "lucide-react";

/** Shorten a wallet address for display. */
function shortenAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export default function WorkHistory() {
  const { profile, workRecords, loading, refresh } = useProgram();

  // Derive profile PDA for status resolution
  const profilePdaStr = profile?.wallet
    ? getProfilePda(profile.wallet)[0].toBase58()
    : "";

  // Resolve effective status for each record
  const enrichedRecords = workRecords.map((w) => {
    const status = resolveWorkStatus(w.verified, profilePdaStr, w.jobId);
    const verifierMeta = getVerifierMeta(profilePdaStr, w.jobId);
    const statusStyle = getStatusColor(status);
    return { ...w, status, verifierMeta, statusStyle };
  });

  const verifiedCount = enrichedRecords.filter((r) => r.status === WorkStatus.Verified).length;
  const rejectedCount = enrichedRecords.filter((r) => r.status === WorkStatus.Rejected).length;
  const pendingCount = enrichedRecords.filter((r) => r.status === WorkStatus.Pending).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Proof of Work</h1>
          <p className="text-sm text-white/30 mt-0.5">All proof records linked to your identity</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm !px-4 !py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {/* Status summary */}
      {workRecords.length > 0 && (
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {verifiedCount} verified
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {pendingCount} pending
          </span>
          {rejectedCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {rejectedCount} rejected
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : workRecords.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/50 mb-1">No work records yet</h3>
          <p className="text-sm text-white/30">Submit your first work to start building reputation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrichedRecords.map((w, i) => {
            const StatusIcon =
              w.status === WorkStatus.Verified ? CheckCircle
              : w.status === WorkStatus.Rejected ? XCircle
              : Clock;
            return (
              <div key={i} className="glass-card-hover p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${w.statusStyle.bg} border ${w.statusStyle.border}`}>
                    <StatusIcon className={`w-5 h-5 ${w.statusStyle.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{w.jobId}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${w.statusStyle.text} ${w.statusStyle.bg} border ${w.statusStyle.border}`}>
                        {getStatusLabel(w.status)}
                      </span>
                    </div>
                    <a href={w.proofLink} target="_blank" rel="noreferrer"
                      className="text-xs text-white/30 hover:text-brand-400 transition-colors truncate block mt-1">
                      {w.proofLink}
                    </a>
                    {/* Verifier metadata */}
                    {w.verifierMeta && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Shield className="w-3 h-3 text-brand-400/60" />
                        <span className="text-[10px] text-white/30">
                          {w.status === WorkStatus.Verified ? "Verified" : "Reviewed"} by{" "}
                          <span className="text-white/45 font-mono">
                            {shortenAddress(w.verifierMeta.verifierWallet)}
                          </span>
                          {" · "}
                          {new Date(w.verifierMeta.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-bold ${
                      w.status === WorkStatus.Verified ? "text-emerald-400"
                      : w.status === WorkStatus.Rejected ? "text-red-400"
                      : "text-white/30"
                    }`}>
                      {w.status === WorkStatus.Verified ? "+10"
                        : w.status === WorkStatus.Rejected ? "-5"
                        : "—"}
                    </span>
                    <p className="text-[10px] text-white/30 mt-0.5">reputation</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {workRecords.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/25 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)] animate-pulse" />
          Showing {workRecords.length} record{workRecords.length !== 1 ? "s" : ""} from Solana Devnet
        </div>
      )}
    </div>
  );
}
