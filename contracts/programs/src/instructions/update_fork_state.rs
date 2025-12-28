//! ===========================================================================
//! Unit09 – Update Fork State Instruction
//! Path: contracts/unit09-program/programs/unit09_program/src/instructions/update_fork_state.rs
//!
//! This instruction updates the high-level state and metadata of an existing
//! `Fork` account.
//!
//! A Fork represents a specific variant of Unit09 with its own:
//! - label (human-readable identity)
//! - metadata URI (off-chain configuration / story manifest)
//! - tags (for discovery and analytics)
//! - activation flag (whether this fork should be used in new flows)
//!
//! On success this instruction:
//! - mutates selected fields on the `Fork` account
//! - updates timestamps
//! - emits a `ForkUpdated` event for indexers and dashboards
//!
//! Guards:
//! - lifecycle must allow writes (`Lifecycle::assert_writes_allowed`)
//! - global config must be active (`Config::assert_active`)
//! - only the fork owner may update the fork (`Fork::assert_owner`)
//!
//! Design notes:
//! - All fields in `UpdateForkStateArgs` are optional; only provided values
//!   are updated. This makes it safe to perform small or partial updates.
//! - Parent, depth, and root status are *not* modified by this instruction.
//!   Those require more explicit migration semantics and are handled by
//!   separate flows if needed.
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::Unit09Error;
use crate::events::ForkUpdated;
use crate::state::{Config, Fork, Lifecycle};

/// Arguments for the `update_fork_state` instruction.
///
/// All fields are optional; only non-`None` values will be applied.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateForkStateArgs {
    /// Optional new label for this fork.
    ///
    /// Example: "unit09-wasteland-alpha"
    pub label: Option<String>,

    /// Optional new metadata URI for this fork.
    ///
    /// Example:
    /// - "https://unit09.org/forks/wasteland-alpha.json"
    /// - "ipfs://Qm..."
    pub metadata_uri: Option<String>,

    /// Optional new tags string.
    ///
    /// Example: "story,alpha,high-risk"
    pub tags: Option<String>,

    /// Optional new activation flag.
    ///
    /// - true  => fork is active and may be selected for new flows
    /// - false => fork is inactive and should not be used in new flows
    pub is_active: Option<bool>,
}

/// Accounts required for the `update_fork_state` instruction.
#[derive(Accounts)]
pub struct UpdateForkState<'info> {
    /// Owner of the fork.
    ///
    /// Must match `fork.owner`. Only this signer may update the fork state.
    #[account(mut)]
    pub owner: Signer<'info>,

    /// Global configuration account.
    ///
    /// Used to ensure the deployment is currently active.
    #[account(
        mut,
        seeds = [CONFIG_SEED.as_bytes()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// Lifecycle account controlling global phases and freeze.
    #[account(
        mut,
        seeds = [LIFECYCLE_SEED.as_bytes()],
        bump = lifecycle.bump,
    )]
    pub lifecycle: Account<'info, Lifecycle>,

    /// Fork account to be updated.
    ///
    /// PDA:
    ///   seeds = [
    ///       FORK_SEED.as_bytes(),
    ///       fork.fork_key.as_ref(),
    ///   ]
    ///   bump  = fork.bump
    #[account(
        mut,
        seeds = [
            FORK_SEED.as_bytes(),
            fork.fork_key.as_ref(),
        ],
        bump = fork.bump,
        has_one = owner @ Unit09Error::InvalidForkOwner,
    )]
    pub fork: Account<'info, Fork>,

    /// System program (required for CPI safety).
    pub system_program: Program<'info, System>,

    /// Clock sysvar used for timestamps.
    pub clock: Sysvar<'info, Clock>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Entry point for the `update_fork_state` instruction.
///
/// Steps:
/// 1. Ensure lifecycle allows writes and config is active.
/// 2. Ensure caller is the fork owner.
/// 3. Validate any provided label / metadata / tags values.
/// 4. Apply updates via `Fork::apply_update`.
/// 5. Emit `ForkUpdated` event.
pub fn handle(ctx: Context<UpdateForkState>, args: UpdateForkStateArgs) -> Result<()> {
    let UpdateForkState {
        owner,
        mut config,
        mut lifecycle,
        mut fork,
        system_program: _,
        clock,
    } = ctx.accounts;

    let clock_ref: &Clock = clock;

    // -----------------------------------------------------------------------
    // Lifecycle and configuration guards
    // -----------------------------------------------------------------------

    lifecycle.assert_writes_allowed()?;
    config.assert_active()?;

    // Ensure the signer is the fork owner. This is already enforced by
    // `has_one = owner` but we keep the explicit check for clarity.
    fork.assert_owner(owner)?;

    // -----------------------------------------------------------------------
    // Early validation on provided fields
    // -----------------------------------------------------------------------

    if let Some(ref label) = args.label {
        if label.is_empty() {
            return err!(Unit09Error::StringEmpty);
        }
        if label.len() > Fork::MAX_LABEL_LEN {
            return err!(Unit09Error::StringTooLong);
        }
    }

    if let Some(ref metadata_uri) = args.metadata_uri {
        if metadata_uri.is_empty() {
            return err!(Unit09Error::StringEmpty);
        }
        if metadata_uri.len() > Fork::MAX_METADATA_URI_LEN {
            return err!(Unit09Error::StringTooLong);
        }

        // Optional: basic scheme check to avoid obviously malformed URIs.
        let has_known_prefix = metadata_uri.starts_with("http://")
            || metadata_uri.starts_with("https://")
            || metadata_uri.starts_with("ipfs://")
            || metadata_uri.starts_with("ar://");

        if !has_known_prefix {
            return err!(Unit09Error::MetadataInvalid);
        }
    }

    if let Some(ref tags) = args.tags {
        if tags.len() > Fork::MAX_TAGS_LEN {
            return err!(Unit09Error::StringTooLong);
        }
    }

    let previous_is_active = fork.is_active;

    // -----------------------------------------------------------------------
    // Apply updates to Fork
    // -----------------------------------------------------------------------

    fork.apply_update(
        args.label,
        args.metadata_uri,
        args.tags,
        args.is_active,
        clock_ref,
    )?;

    // -----------------------------------------------------------------------
    // Emit ForkUpdated event
    // -----------------------------------------------------------------------

    emit!(ForkUpdated {
        fork: fork.key(),
        owner: fork.owner,
        previous_is_active,
        new_is_active: fork.is_active,
        updated_at: fork.updated_at,
    });

    Ok(())
}
