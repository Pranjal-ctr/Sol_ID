/**
 * useSnsLookup — Resolve a connected wallet to its `.sol` domain via SNS.
 *
 * Flow:
 *   1. Wallet connects → hook fires
 *   2. Check for demo override (`?sns=alice` → "alice.sol")
 *   3. If no override → call SNS SDK reverse lookup
 *   4. Return { snsName, loading }
 *
 * On Devnet, very few wallets own `.sol` domains, so the demo
 * override is important for showcasing the SNS path to judges.
 */

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

// ── Types ──

export interface SnsLookupResult {
  /** The resolved `.sol` domain, e.g. "alice.sol". Null if none found. */
  snsName: string | null;
  /** True while the lookup is in progress. */
  loading: boolean;
}

// ── Hook ──

export function useSnsLookup(walletPublicKey: PublicKey | null): SnsLookupResult {
  const { connection } = useConnection();
  const [snsName, setSnsName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletPublicKey) {
      setSnsName(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function resolve() {
      try {
        // ── Demo override: ?sns=alice → "alice.sol" ──
        const params = new URLSearchParams(window.location.search);
        const demoSns = params.get("sns");
        if (demoSns) {
          // Small delay to show the loading state to judges
          await new Promise((r) => setTimeout(r, 800));
          if (!cancelled) {
            setSnsName(`${demoSns}.sol`);
            setLoading(false);
          }
          return;
        }

        // ── Real SNS reverse lookup ──
        const { getAllDomains, performReverseLookup } = await import(
          "@bonfida/spl-name-service"
        );

        const domainKeys = await getAllDomains(connection, walletPublicKey!);

        if (domainKeys.length === 0) {
          if (!cancelled) {
            setSnsName(null);
            setLoading(false);
          }
          return;
        }

        // Use the first domain found (primary)
        const name = await performReverseLookup(connection, domainKeys[0]);

        if (!cancelled) {
          setSnsName(name ? `${name}.sol` : null);
          setLoading(false);
        }
      } catch (err) {
        // Network errors, missing programs on Devnet, etc.
        // Gracefully fall back to no SNS identity.
        console.warn("[useSnsLookup] SNS lookup failed, falling back:", err);
        if (!cancelled) {
          setSnsName(null);
          setLoading(false);
        }
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [walletPublicKey, connection]);

  return { snsName, loading };
}
