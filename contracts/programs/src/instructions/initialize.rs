//! ===========================================================================
//! Unit09 – Initialize Instruction
//! Path: contracts/unit09-program/programs/unit09_program/src/instructions/initialize.rs
//!
//! This instruction bootstraps a fresh Unit09 deployment by creating and
//! initializing the core singleton accounts:
//!
//! - `Config`   : global configuration (admin, fees, limits, flags)
//! - `Metrics`  : global aggregate counters
//! - `Lifecycle`: high-level lifecycle and global freeze flags
//!
//! Design goals:
//! - Single entry point for first-time deployment
//! - Explicit, validated initialization arguments
//! - Clear separation between configuration, metrics, and lifecycle
//! - Easy to extend in future migrations
//!
//! The `Initialize` instruction is expected to be called exactly once per
//! deployment. Subsequent configuration changes should go through
//! `set_config` and other admin instructions.
//!
//! Example (from lib.rs):
//!
//! ```ignore
//! pub fn initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
//!     instructions::initialize(ctx, args)
//! }
//! ```
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::Unit09Error;
use crate::state::{Config, Lifecycle, Metrics};

/// Arguments for the `initialize` instruction.
///
/// These values define the initial shape of the deployment.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeArgs {
    /// Admin authority that will control global configuration and other
    /// admin-only instructions.
    pub admin: Pubkey,

    /// Initial fee in basis points (0–10_000).
    ///
    /// This is constrained by `MAX_FEE_BPS` at the config level.
    pub fee_bps: u16,

    /// Maximum number of modules that may be associated with a single
    /// repository before off-chain tooling is expected to shard or
    /// reorganize data.
    pub max_modules_per_repo: u32,

    /// Optional policy reference (hash or opaque bytes) pointing to
    /// an off-chain governance or configuration document.
    ///
    /// If you do not have one yet, pass `[0u8; 32]`.
    pub policy_ref: [u8; 32],

    /// Optional lifecycle note reference (hash or opaque bytes) pointing
    /// to an off-chain lifecycle or governance document for this deployment.
    ///
    /// If not needed, pass `[0u8; 32]`.
    pub lifecycle_note_ref: [u8; 32],
}

/// Accounts required for the `initialize` instruction.
///
/// This instruction must be called only once per deployment. If called again,
/// it will fail due to existing PDAs.
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Payer for all newly created accounts.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Admin authority for the deployment (must match `args.admin`).
    ///
    /// This is stored in the `Config` account. We accept it as an unchecked
    /// account here because we only care about its public key.
    /// Frontends are expected to ensure this is a real signer in practice.
    /// (You may tighten this to `Signer<'info>` if you want admin to pay.)
    pub admin: UncheckedAccount<'info>,

    /// Global configuration account (singleton).
    ///
    /// PDA: seeds = [CONFIG_SEED], bump
    #[account(
        init,
        payer = payer,
        space = Config::LEN,
        seeds = [CONFIG_SEED.as_bytes()],
        bump,
    )]
    pub config: Account<'info, Config>,

    /// Global metrics account (singleton).
    ///
    /// PDA: seeds = [METRICS_SEED], bump
    #[account(
        init,
        payer = payer,
        space = Metrics::LEN,
        seeds = [METRICS_SEED.as_bytes()],
        bump,
    )]
    pub metrics: Account<'info, Metrics>,

    /// Lifecycle account (singleton).
    ///
    /// PDA: seeds = [LIFECYCLE_SEED], bump
    #[account(
        init,
        payer = payer,
        space = Lifecycle::LEN,
        seeds = [LIFECYCLE_SEED.as_bytes()],
        bump,
    )]
    pub lifecycle: Account<'info, Lifecycle>,

    /// System program.
    pub system_program: Program<'info, System>,

    /// Rent sysvar (not strictly required in modern Solana, but kept here
    /// for completeness and potential future use).
    pub rent: Sysvar<'info, Rent>,

    /// Clock sysvar used for timestamps.
    pub clock: Sysvar<'info, Clock>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Entry point for the `initialize` instruction.
///
/// This function is a thin wrapper that:
/// - validates arguments
/// - derives bumps from account seeds
/// - calls domain-specific `init` methods on `Config`, `Metrics`, `Lifecycle`
pub fn handle(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
    let Initialize {
        payer: _,
        admin,
        mut config,
        mut metrics,
        mut lifecycle,
        system_program: _,
        rent: _,
        clock,
    } = ctx.accounts;

    let clock_ref: &Clock = clock;

    // -----------------------------------------------------------------------
    // Basic argument validation
    // -----------------------------------------------------------------------

    // Ensure admin key in args matches the provided admin account.
    if admin.key() != args.admin {
        return err!(Unit09Error::InvalidAdmin);
    }

    // Fee bounds and max_modules bounds are validated again in Config::init,
    // but we perform a quick early check here to fail fast.
    if args.fee_bps > MAX_FEE_BPS {
        return err!(Unit09Error::InvalidFeeBps);
    }
    if args.max_modules_per_repo == 0 {
        return err!(Unit09Error::ValueOutOfRange);
    }

    // -----------------------------------------------------------------------
    // Derive PDA bumps from context
    // -----------------------------------------------------------------------

    let config_bump = *ctx
        .bumps
        .get("config")
        .ok_or(Unit09Error::InternalError)?;
    let metrics_bump = *ctx
        .bumps
        .get("metrics")
        .ok_or(Unit09Error::InternalError)?;
    let lifecycle_bump = *ctx
        .bumps
        .get("lifecycle")
        .ok_or(Unit09Error::InternalError)?;

    // -----------------------------------------------------------------------
    // Initialize Config
    // -----------------------------------------------------------------------

    config.init(
        args.admin,
        args.fee_bps,
        args.max_modules_per_repo,
        args.policy_ref,
        config_bump,
        clock_ref,
    )?;

    // -----------------------------------------------------------------------
    // Initialize Metrics
    // -----------------------------------------------------------------------

    metrics.init(metrics_bump, clock_ref)?;

    // -----------------------------------------------------------------------
    // Initialize Lifecycle
    // -----------------------------------------------------------------------

    lifecycle.init(lifecycle_bump, clock_ref, args.lifecycle_note_ref)?;

    Ok(())
}
