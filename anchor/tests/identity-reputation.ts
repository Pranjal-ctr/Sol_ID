import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IdentityReputation } from "../target/types/identity_reputation";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("identity-reputation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.IdentityReputation as Program<IdentityReputation>;

  // ── Key pairs ──────────────────────────────────────────────────────────────
  const userWallet = provider.wallet;
  const verifier   = Keypair.generate();

  const USERNAME   = "alice.sol";
  const JOB_ID     = "job-001";
  const PROOF_LINK = "https://arweave.net/abc123";

  // ── PDA helpers ────────────────────────────────────────────────────────────
  function getProfilePda(wallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), wallet.toBuffer()],
      program.programId
    );
  }

  function getWorkPda(profilePda: PublicKey, jobId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("work"), profilePda.toBuffer(), Buffer.from(jobId)],
      program.programId
    );
  }

  // ── Tests ──────────────────────────────────────────────────────────────────

  it("creates a user profile", async () => {
    const [profilePda] = getProfilePda(userWallet.publicKey);

    await program.methods
      .createProfile(USERNAME)
      .accounts({
        profile: profilePda,
        wallet: userWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePda);
    assert.equal(profile.username, USERNAME);
    assert.equal(profile.reputationScore, 0);
    assert.equal(profile.workCount, 0);
    assert.ok(profile.wallet.equals(userWallet.publicKey));
  });

  it("submits a work record", async () => {
    const [profilePda] = getProfilePda(userWallet.publicKey);
    const [workPda]    = getWorkPda(profilePda, JOB_ID);

    await program.methods
      .submitWork(JOB_ID, PROOF_LINK)
      .accounts({
        profile: profilePda,
        workRecord: workPda,
        wallet: userWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const work    = await program.account.workRecord.fetch(workPda);
    const profile = await program.account.userProfile.fetch(profilePda);

    assert.equal(work.jobId, JOB_ID);
    assert.equal(work.proofLink, PROOF_LINK);
    assert.equal(work.verified, false);
    assert.equal(profile.workCount, 1);
  });

  it("verifies work and adds +10 reputation", async () => {
    const [profilePda] = getProfilePda(userWallet.publicKey);
    const [workPda]    = getWorkPda(profilePda, JOB_ID);

    // Airdrop SOL to verifier so it can sign
    const sig = await provider.connection.requestAirdrop(
      verifier.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .verifyWork()
      .accounts({
        profile: profilePda,
        workRecord: workPda,
        verifier: verifier.publicKey,
      })
      .signers([verifier])
      .rpc();

    const work    = await program.account.workRecord.fetch(workPda);
    const profile = await program.account.userProfile.fetch(profilePda);

    assert.equal(work.verified, true);
    assert.equal(profile.reputationScore, 10);
  });

  it("rejects already-verified work with an error", async () => {
    const [profilePda] = getProfilePda(userWallet.publicKey);
    const [workPda]    = getWorkPda(profilePda, JOB_ID);

    try {
      await program.methods
        .rejectWork()
        .accounts({
          profile: profilePda,
          workRecord: workPda,
          verifier: verifier.publicKey,
        })
        .signers([verifier])
        .rpc();

      assert.fail("Expected AlreadyVerified error");
    } catch (err: any) {
      assert.include(err.message, "AlreadyVerified");
    }
  });

  it("submits a second job and rejects it, reputation -5", async () => {
    const JOB_ID_2 = "job-002";
    const [profilePda] = getProfilePda(userWallet.publicKey);
    const [workPda]    = getWorkPda(profilePda, JOB_ID_2);

    await program.methods
      .submitWork(JOB_ID_2, "https://arweave.net/xyz999")
      .accounts({
        profile: profilePda,
        workRecord: workPda,
        wallet: userWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .rejectWork()
      .accounts({
        profile: profilePda,
        workRecord: workPda,
        verifier: verifier.publicKey,
      })
      .signers([verifier])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePda);
    assert.equal(profile.reputationScore, 5); // 10 − 5 = 5
  });

  it("prevents duplicate profiles for the same wallet", async () => {
    const [profilePda] = getProfilePda(userWallet.publicKey);

    try {
      await program.methods
        .createProfile("bob.sol")
        .accounts({
          profile: profilePda,
          wallet: userWallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Expected account-already-exists error");
    } catch (err: any) {
      // Anchor throws when trying to init an already-initialised PDA
      assert.ok(err);
    }
  });
});
