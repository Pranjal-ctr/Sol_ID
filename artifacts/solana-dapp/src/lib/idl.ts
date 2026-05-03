/**
 * IDL (Interface Definition Language) for the identity-reputation Anchor program.
 *
 * This file describes every instruction, account, error, and event that the
 * on-chain program exposes. @coral-xyz/anchor reads this at runtime to:
 *   1. Know how to serialize/deserialize instruction data.
 *   2. Know which accounts each instruction expects.
 *   3. Provide TypeScript types for the frontend.
 *
 * After running `anchor build` on devnet, replace PROGRAM_ID below with the
 * real address printed by:
 *   solana address -k anchor/target/deploy/identity_reputation-keypair.json
 */

/**
 * Replace this with your real program ID after running:
 *   anchor build && anchor deploy
 *   solana address -k anchor/target/deploy/identity_reputation-keypair.json
 *
 * Until then the app loads and all wallet/UI features work; on-chain calls
 * will fail (expected — the program isn't deployed yet).
 *
 * Must be a valid base-58 public key (no 0, O, I, l characters).
 * Using the System Program address as a safe placeholder:
 */
export const PROGRAM_ID = "11111111111111111111111111111111";

export const IDL = {
  version: "0.1.0",
  name: "identity_reputation",

  // ── Instructions ──────────────────────────────────────────────────────────
  instructions: [
    {
      /**
       * create_profile(username)
       *
       * Creates a UserProfile PDA seeded by [b"profile", wallet].
       * Because `init` is used, this fails if the PDA already exists —
       * enforcing one profile per wallet at the protocol level.
       */
      name: "createProfile",
      accounts: [
        {
          name: "profile",
          isMut: true,
          isSigner: false,
          docs: ["PDA: seeds = [b'profile', wallet]. Created by this ix."],
        },
        {
          name: "wallet",
          isMut: true,
          isSigner: true,
          docs: ["Payer and authority. Must match seeds."],
        },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "username", type: "string" }],
    },

    {
      /**
       * submit_work(job_id, proof_link)
       *
       * Creates a WorkRecord PDA seeded by [b"work", profile, job_id].
       * The profile's work_count is incremented.
       * Because `init` is used, the same job_id cannot be submitted twice
       * for the same profile.
       */
      name: "submitWork",
      accounts: [
        {
          name: "profile",
          isMut: true,
          isSigner: false,
          docs: ["The caller's UserProfile PDA — work_count is incremented."],
        },
        {
          name: "workRecord",
          isMut: true,
          isSigner: false,
          docs: ["PDA: seeds = [b'work', profile, job_id]. Created by this ix."],
        },
        { name: "wallet", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "jobId", type: "string" },
        { name: "proofLink", type: "string" },
      ],
    },

    {
      /**
       * verify_work()
       *
       * A trusted verifier marks the WorkRecord as verified = true and
       * adds REPUTATION_REWARD_VERIFY (+10) to the profile's reputation_score.
       * Fails with AlreadyVerified if the record was previously verified.
       * Uses saturating addition — reputation cannot overflow.
       */
      name: "verifyWork",
      accounts: [
        {
          name: "profile",
          isMut: true,
          isSigner: false,
          docs: ["Profile whose reputation is increased by +10."],
        },
        {
          name: "workRecord",
          isMut: true,
          isSigner: false,
          docs: ["The WorkRecord to verify. Must link to profile via has_one."],
        },
        {
          name: "verifier",
          isMut: false,
          isSigner: true,
          docs: ["Trusted authority signing the review."],
        },
      ],
      args: [],
    },

    {
      /**
       * reject_work()
       *
       * A trusted verifier penalises the profile by REPUTATION_PENALTY_REJECT
       * (-5). Reputation is floored at 0 via saturating subtraction.
       * Fails with AlreadyVerified if the record was previously verified.
       */
      name: "rejectWork",
      accounts: [
        {
          name: "profile",
          isMut: true,
          isSigner: false,
          docs: ["Profile whose reputation is decreased by -5 (floored at 0)."],
        },
        {
          name: "workRecord",
          isMut: true,
          isSigner: false,
          docs: ["The WorkRecord to reject. Must link to profile via has_one."],
        },
        {
          name: "verifier",
          isMut: false,
          isSigner: true,
          docs: ["Trusted authority signing the review."],
        },
      ],
      args: [],
    },
  ],

  // ── On-chain account schemas ───────────────────────────────────────────────
  accounts: [
    {
      /**
       * UserProfile — one per wallet.
       * PDA seeds: ["profile", wallet_pubkey]
       */
      name: "UserProfile",
      type: {
        kind: "struct",
        fields: [
          { name: "wallet",          type: "publicKey" },
          { name: "username",        type: "string"    },
          { name: "reputationScore", type: "u32"       },
          { name: "workCount",       type: "u32"       },
          { name: "bump",            type: "u8"        },
        ],
      },
    },
    {
      /**
       * WorkRecord — one per (profile, job_id) pair.
       * PDA seeds: ["work", profile_pubkey, job_id_bytes]
       */
      name: "WorkRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "profile",   type: "publicKey" },
          { name: "jobId",     type: "string"    },
          { name: "proofLink", type: "string"    },
          { name: "verified",  type: "bool"      },
          { name: "bump",      type: "u8"        },
        ],
      },
    },
  ],

  // ── Events emitted by the program ─────────────────────────────────────────
  events: [
    {
      name: "ProfileCreated",
      fields: [
        { name: "wallet",   type: "publicKey", index: false },
        { name: "username", type: "string",    index: false },
      ],
    },
    {
      name: "WorkSubmitted",
      fields: [
        { name: "profile", type: "publicKey", index: false },
        { name: "jobId",   type: "string",    index: false },
      ],
    },
    {
      name: "WorkReviewed",
      fields: [
        { name: "profile",        type: "publicKey", index: false },
        { name: "jobId",          type: "string",    index: false },
        { name: "accepted",       type: "bool",      index: false },
        { name: "newReputation",  type: "u32",       index: false },
      ],
    },
  ],

  // ── Custom error codes ─────────────────────────────────────────────────────
  errors: [
    { code: 6000, name: "InvalidUsername",  msg: "Username must be between 1 and 50 characters."              },
    { code: 6001, name: "InvalidJobId",     msg: "Job ID must be between 1 and 50 characters."                },
    { code: 6002, name: "InvalidProofLink", msg: "Proof link must be between 1 and 200 characters."           },
    { code: 6003, name: "AlreadyVerified",  msg: "This work record has already been verified and cannot be reviewed again." },
  ],
} as const;

export type IdentityReputationIDL = typeof IDL;
