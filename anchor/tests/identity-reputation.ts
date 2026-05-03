import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IdentityReputation } from "../target/types/identity_reputation";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Identity & Reputation Program
// ─────────────────────────────────────────────────────────────────────────────
describe("identity-reputation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .IdentityReputation as Program<IdentityReputation>;

  // ── Shared actors ──────────────────────────────────────────────────────────
  const user     = provider.wallet;          // the identity owner
  const verifier = Keypair.generate();       // trusted off-chain reviewer

  // ── Test fixtures ──────────────────────────────────────────────────────────
  const USERNAME   = "alice.sol";
  const JOB_ID_1   = "job-001";             // used for verify path
  const JOB_ID_2   = "job-002";             // used for reject path (10 → 5)
  const JOB_ID_3   = "job-003";             // used for reject path (5  → 0)
  const JOB_ID_4   = "job-004";             // used for floor test  (0  → 0)
  const PROOF_LINK = "https://arweave.net/abc123def456";

  // ── PDA derivation helpers ─────────────────────────────────────────────────

  /** Derives the UserProfile PDA for a given wallet. */
  function profilePda(wallet: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), wallet.toBuffer()],
      program.programId
    );
    return pda;
  }

  /** Derives the WorkRecord PDA for a given profile + job ID. */
  function workPda(profile: PublicKey, jobId: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("work"), profile.toBuffer(), Buffer.from(jobId)],
      program.programId
    );
    return pda;
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  before("fund the verifier account", async () => {
    const sig = await provider.connection.requestAirdrop(
      verifier.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
    console.log("  [setup] Verifier:", verifier.publicKey.toBase58());
    console.log("  [setup] User wallet:", user.publicKey.toBase58());
  });

  // ── Helper: submit a work record ───────────────────────────────────────────

  async function submitWork(jobId: string, proofLink = PROOF_LINK) {
    const profile = profilePda(user.publicKey);
    const work    = workPda(profile, jobId);
    await program.methods
      .submitWork(jobId, proofLink)
      .accounts({
        profile,
        workRecord: work,
        wallet: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return { profile, work };
  }

  // ── Helper: reject a work record ───────────────────────────────────────────

  async function rejectWork(jobId: string) {
    const profile = profilePda(user.publicKey);
    const work    = workPda(profile, jobId);
    await program.methods
      .rejectWork()
      .accounts({ profile, workRecord: work, verifier: verifier.publicKey })
      .signers([verifier])
      .rpc();
    return profile;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Create profile
  // ═══════════════════════════════════════════════════════════════════════════

  it("creates a user profile successfully", async () => {
    const profile = profilePda(user.publicKey);

    await program.methods
      .createProfile(USERNAME)
      .accounts({
        profile,
        wallet: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const data = await program.account.userProfile.fetch(profile);

    console.log("  [1] Profile PDA    :", profile.toBase58());
    console.log("  [1] Username       :", data.username);
    console.log("  [1] Reputation     :", data.reputationScore);
    console.log("  [1] Work count     :", data.workCount);

    assert.equal(data.username, USERNAME,                   "username mismatch");
    assert.isTrue(data.wallet.equals(user.publicKey),       "wallet mismatch");
    assert.equal(data.reputationScore, 0,                   "initial reputation should be 0");
    assert.equal(data.workCount, 0,                         "initial work count should be 0");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Prevent duplicate profile
  // ═══════════════════════════════════════════════════════════════════════════

  it("prevents creating a duplicate profile for the same wallet", async () => {
    const profile = profilePda(user.publicKey);

    console.log("  [2] Attempting to create a second profile for:", user.publicKey.toBase58());

    try {
      await program.methods
        .createProfile("bob.sol")
        .accounts({
          profile,
          wallet: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Expected an error when creating a duplicate profile");
    } catch (err: any) {
      // Anchor throws when `init` finds the PDA already initialised
      console.log("  [2] Correctly rejected with:", err.message.split("\n")[0]);
      assert.ok(err, "An error should have been thrown");
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Submit work
  // ═══════════════════════════════════════════════════════════════════════════

  it("submits a work record successfully", async () => {
    const { profile, work } = await submitWork(JOB_ID_1);

    const workData    = await program.account.workRecord.fetch(work);
    const profileData = await program.account.userProfile.fetch(profile);

    console.log("  [3] Work PDA       :", work.toBase58());
    console.log("  [3] Job ID         :", workData.jobId);
    console.log("  [3] Proof link     :", workData.proofLink);
    console.log("  [3] Verified       :", workData.verified);
    console.log("  [3] Profile work count:", profileData.workCount);

    assert.equal(workData.jobId, JOB_ID_1,                 "job ID mismatch");
    assert.equal(workData.proofLink, PROOF_LINK,            "proof link mismatch");
    assert.isFalse(workData.verified,                       "new work should not be verified");
    assert.isTrue(workData.profile.equals(profile),         "work record should link to the correct profile");
    assert.equal(profileData.workCount, 1,                  "work count should increment to 1");
    assert.equal(profileData.reputationScore, 0,            "reputation unchanged after submission");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Verify work → +10 reputation
  // ═══════════════════════════════════════════════════════════════════════════

  it("verifies work and increases reputation by +10", async () => {
    const profile = profilePda(user.publicKey);
    const work    = workPda(profile, JOB_ID_1);

    const before = await program.account.userProfile.fetch(profile);

    await program.methods
      .verifyWork()
      .accounts({ profile, workRecord: work, verifier: verifier.publicKey })
      .signers([verifier])
      .rpc();

    const workData    = await program.account.workRecord.fetch(work);
    const profileData = await program.account.userProfile.fetch(profile);

    console.log("  [4] Reputation before:", before.reputationScore);
    console.log("  [4] Reputation after :", profileData.reputationScore);
    console.log("  [4] Work verified    :", workData.verified);

    assert.isTrue(workData.verified,                        "work should be marked verified");
    assert.equal(
      profileData.reputationScore,
      before.reputationScore + 10,
      "reputation should increase by exactly 10"
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Prevent verifying already-verified work
  // ═══════════════════════════════════════════════════════════════════════════

  it("prevents verifying an already-verified work record", async () => {
    const profile = profilePda(user.publicKey);
    const work    = workPda(profile, JOB_ID_1);    // JOB_ID_1 was verified in test 4

    console.log("  [5] Attempting second verify on already-verified work:", JOB_ID_1);

    try {
      await program.methods
        .verifyWork()
        .accounts({ profile, workRecord: work, verifier: verifier.publicKey })
        .signers([verifier])
        .rpc();

      assert.fail("Expected AlreadyVerified error");
    } catch (err: any) {
      console.log("  [5] Correctly rejected with:", err.message.split("\n")[0]);
      assert.include(
        err.message,
        "AlreadyVerified",
        "error should be AlreadyVerified"
      );
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Reject work → -5 reputation, floored at 0
  // ═══════════════════════════════════════════════════════════════════════════

  it("rejects work and decreases reputation by -5 but never below 0", async () => {
    // ── Step A: 10 → 5 ──────────────────────────────────────────────────────
    await submitWork(JOB_ID_2);
    await rejectWork(JOB_ID_2);

    const afterFirst = await program.account.userProfile.fetch(
      profilePda(user.publicKey)
    );
    console.log("  [6a] Reputation after first rejection (10 → 5):", afterFirst.reputationScore);
    assert.equal(afterFirst.reputationScore, 5, "reputation should drop from 10 to 5");

    // ── Step B: 5 → 0 ───────────────────────────────────────────────────────
    await submitWork(JOB_ID_3);
    await rejectWork(JOB_ID_3);

    const afterSecond = await program.account.userProfile.fetch(
      profilePda(user.publicKey)
    );
    console.log("  [6b] Reputation after second rejection (5 → 0):", afterSecond.reputationScore);
    assert.equal(afterSecond.reputationScore, 0, "reputation should drop from 5 to 0");

    // ── Step C: floor check — 0 - 5 must still be 0 (no underflow) ──────────
    await submitWork(JOB_ID_4);
    await rejectWork(JOB_ID_4);

    const afterFloor = await program.account.userProfile.fetch(
      profilePda(user.publicKey)
    );
    console.log("  [6c] Reputation at floor  (0 - 5 = stays 0):", afterFloor.reputationScore);
    assert.equal(
      afterFloor.reputationScore,
      0,
      "reputation should not go below 0 (saturating subtraction)"
    );
  });
});
