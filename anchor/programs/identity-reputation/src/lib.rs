use anchor_lang::prelude::*;

declare_id!("4DNAXZBUwD8ejo6UEDzbq89faMjARWwV6DuWJMKHnyDm");

#[program]
pub mod identity_reputation {
    use super::*;

    /// Create a new user profile tied to the caller's wallet.
    /// Each wallet can only ever hold one profile (enforced by PDA seeds).
    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
        require!(
            username.len() > 0 && username.len() <= MAX_USERNAME_LEN,
            IdentityError::InvalidUsername
        );

        let profile = &mut ctx.accounts.profile;
        profile.wallet = ctx.accounts.wallet.key();
        profile.username = username;
        profile.reputation_score = 0;
        profile.work_count = 0;
        profile.bump = ctx.bumps.profile;

        emit!(ProfileCreated {
            wallet: profile.wallet,
            username: profile.username.clone(),
        });

        Ok(())
    }

    /// Submit a new work record linked to the caller's profile.
    /// `job_id` uniquely identifies the job; `proof_link` points to evidence (e.g. IPFS, Arweave).
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        job_id: String,
        proof_link: String,
    ) -> Result<()> {
        require!(
            job_id.len() > 0 && job_id.len() <= MAX_JOB_ID_LEN,
            IdentityError::InvalidJobId
        );
        require!(
            proof_link.len() > 0 && proof_link.len() <= MAX_PROOF_LINK_LEN,
            IdentityError::InvalidProofLink
        );

        let profile = &mut ctx.accounts.profile;
        let work = &mut ctx.accounts.work_record;

        work.profile = profile.key();
        work.job_id = job_id.clone();
        work.proof_link = proof_link;
        work.verified = false;
        work.bump = ctx.bumps.work_record;

        // Track total work submissions on the profile
        profile.work_count = profile.work_count.checked_add(1).unwrap();

        emit!(WorkSubmitted {
            profile: profile.key(),
            job_id,
        });

        Ok(())
    }

    /// Mark a work record as verified and reward the owner with +10 reputation.
    /// Only the designated verifier (a trusted off-chain authority) may call this.
    pub fn verify_work(ctx: Context<ReviewWork>) -> Result<()> {
        let work = &mut ctx.accounts.work_record;

        require!(!work.verified, IdentityError::AlreadyVerified);

        work.verified = true;

        // Saturating add prevents overflow on u32
        let profile = &mut ctx.accounts.profile;
        profile.reputation_score = profile
            .reputation_score
            .saturating_add(REPUTATION_REWARD_VERIFY);

        emit!(WorkReviewed {
            profile: profile.key(),
            job_id: work.job_id.clone(),
            accepted: true,
            new_reputation: profile.reputation_score,
        });

        Ok(())
    }

    /// Reject a work record and penalise the owner by -5 reputation.
    /// Reputation is floored at 0 — it cannot go negative.
    /// Only the designated verifier may call this.
    pub fn reject_work(ctx: Context<ReviewWork>) -> Result<()> {
        let work = &mut ctx.accounts.work_record;

        require!(!work.verified, IdentityError::AlreadyVerified);

        // Saturating sub keeps reputation ≥ 0
        let profile = &mut ctx.accounts.profile;
        profile.reputation_score = profile
            .reputation_score
            .saturating_sub(REPUTATION_PENALTY_REJECT);

        emit!(WorkReviewed {
            profile: profile.key(),
            job_id: work.job_id.clone(),
            accepted: false,
            new_reputation: profile.reputation_score,
        });

        Ok(())
    }
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

pub const MAX_USERNAME_LEN: usize = 50;
pub const MAX_JOB_ID_LEN: usize = 50;
pub const MAX_PROOF_LINK_LEN: usize = 200;

pub const REPUTATION_REWARD_VERIFY: u32 = 10;
pub const REPUTATION_PENALTY_REJECT: u32 = 5;

// ─────────────────────────────────────────────
// Account Structures
// ─────────────────────────────────────────────

/// A user's on-chain identity — one per wallet.
///
/// PDA seeds: ["profile", wallet_pubkey]
/// This guarantees a single profile per wallet at the protocol level.
#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    /// The wallet that owns this profile.
    pub wallet: Pubkey,

    /// Human-readable name (e.g. "alice.sol"). Max 50 bytes.
    #[max_len(50)]
    pub username: String,

    /// Cumulative reputation score, starts at 0.
    /// +10 for each verified work record, −5 for each rejection.
    pub reputation_score: u32,

    /// Total number of work records ever submitted.
    pub work_count: u32,

    /// PDA bump for off-chain address derivation.
    pub bump: u8,
}

/// A single piece of work submitted by a user.
///
/// PDA seeds: ["work", profile_pubkey, job_id_bytes]
/// Each unique job_id can only be submitted once per profile.
#[account]
#[derive(InitSpace)]
pub struct WorkRecord {
    /// The profile this work record belongs to.
    pub profile: Pubkey,

    /// External job identifier (e.g. a platform job UUID). Max 50 bytes.
    #[max_len(50)]
    pub job_id: String,

    /// URL or content-hash pointing to the work proof. Max 200 bytes.
    #[max_len(200)]
    pub proof_link: String,

    /// Whether a verifier has approved this record.
    pub verified: bool,

    /// PDA bump for off-chain address derivation.
    pub bump: u8,
}

// ─────────────────────────────────────────────
// Instruction Context Structs
// ─────────────────────────────────────────────

/// Accounts required to create a new user profile.
#[derive(Accounts)]
#[instruction(username: String)]
pub struct CreateProfile<'info> {
    /// The profile PDA — derived from [b"profile", wallet].
    /// `init` ensures this account does not already exist,
    /// enforcing the one-profile-per-wallet constraint.
    #[account(
        init,
        payer = wallet,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", wallet.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    /// The user's wallet — signs the transaction and pays rent.
    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Accounts required to submit a work record.
#[derive(Accounts)]
#[instruction(job_id: String, proof_link: String)]
pub struct SubmitWork<'info> {
    /// The caller's profile — must already exist.
    #[account(
        mut,
        seeds = [b"profile", wallet.key().as_ref()],
        bump = profile.bump,
        has_one = wallet
    )]
    pub profile: Account<'info, UserProfile>,

    /// The new work record PDA — derived from [b"work", profile, job_id].
    /// Using `job_id` in the seeds means one record per job per profile.
    #[account(
        init,
        payer = wallet,
        space = 8 + WorkRecord::INIT_SPACE,
        seeds = [b"work", profile.key().as_ref(), job_id.as_bytes()],
        bump
    )]
    pub work_record: Account<'info, WorkRecord>,

    /// Must match the wallet stored on the profile — prevents impersonation.
    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Accounts required to verify or reject a work record.
///
/// `verifier` is a trusted off-chain authority (e.g. a multisig or DAO).
/// In production, add a constraint such as `verifier.key() == KNOWN_AUTHORITY_PUBKEY`
/// or store an authority pubkey in a global config PDA.
#[derive(Accounts)]
#[instruction()]
pub struct ReviewWork<'info> {
    /// The profile that owns the work record — updated in place.
    #[account(
        mut,
        seeds = [b"profile", profile.wallet.as_ref()],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserProfile>,

    /// The work record being reviewed.
    /// `has_one = profile` ensures the record truly belongs to this profile.
    #[account(
        mut,
        seeds = [b"work", profile.key().as_ref(), work_record.job_id.as_bytes()],
        bump = work_record.bump,
        has_one = profile
    )]
    pub work_record: Account<'info, WorkRecord>,

    /// The trusted verifier — signs the review transaction.
    /// Replace with a stricter check (e.g. global config PDA) for production.
    pub verifier: Signer<'info>,
}

// ─────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────

#[event]
pub struct ProfileCreated {
    pub wallet: Pubkey,
    pub username: String,
}

#[event]
pub struct WorkSubmitted {
    pub profile: Pubkey,
    pub job_id: String,
}

#[event]
pub struct WorkReviewed {
    pub profile: Pubkey,
    pub job_id: String,
    pub accepted: bool,
    pub new_reputation: u32,
}

// ─────────────────────────────────────────────
// Custom Errors
// ─────────────────────────────────────────────

#[error_code]
pub enum IdentityError {
    #[msg("Username must be between 1 and 50 characters.")]
    InvalidUsername,

    #[msg("Job ID must be between 1 and 50 characters.")]
    InvalidJobId,

    #[msg("Proof link must be between 1 and 200 characters.")]
    InvalidProofLink,

    #[msg("This work record has already been verified and cannot be reviewed again.")]
    AlreadyVerified,
}
