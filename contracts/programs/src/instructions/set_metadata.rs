//! ===========================================================================
//! Unit09 – Set Metadata Instruction
//! Path: contracts/unit09-program/programs/unit09_program/src/instructions/set_metadata.rs
//!
//! This instruction manages the global, human-facing metadata for a Unit09
//! deployment. While accounts like `Config`, `Repo`, and `Module` focus on
//! execution and indexing, `GlobalMetadata` is designed for:
//!
//! - the public website
//! - explorers / dashboards
//! - documentation portals
//! - marketing and storytelling surfaces
//!
//! On success this instruction:
//! - creates `GlobalMetadata` PDA on first run (if it does not exist)
//! - updates high-level descriptive fields on subsequent runs
//! - bumps the `updated_at` timestamp
//! - emits `GlobalMetadataUpdated` event for indexers and UIs
//!
//! Guards:
//! - lifecycle must allow writes (`Lifecycle::assert_writes_allowed`)
//! - only the current `Config::admin` is allowed to modify metadata
//!
//! PDA layout:
//! - GlobalMetadata:
//!     seeds = [GLOBAL_METADATA_SEED.as_bytes()]
//!     bump  = global_metadata.bump
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::Unit09Error;
use crate::events::GlobalMetadataUpdated;
use crate::state::{Config, GlobalMetadata, Lifecycle};

/// Arguments for the `set_metadata` instruction.
///
/// All fields are optional; only non-`None` values are applied. This makes it
/// safe to perform partial updates without rewriting the entire structure.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetMetadataArgs {
    /// Optional high-level description for the deployment.
    ///
    /// Example:
    /// "Unit09 is a story-driven on-chain AI raccoon that consumes Solana code,
    ///  generates runnable modules, and evolves through forks."
    pub description: Option<String>;

    /// Optional comma-separated tag string.
    ///
    /// Example:
    /// "solana,ai,module,framework,story"
    pub tags: Option<String>;

    /// Optional canonical website URL.
    ///
    /// Example:
    /// "https://unit09.org"
    pub website_url: Option<String>;

    /// Optional documentation URL.
    ///
    /// Example:
    /// "https://docs.unit09.org"
    pub docs_url: Option<String>;

    /// Optional dashboard URL (metrics, explorers, etc.).
    ///
    /// Example:
    /// "https://unit09.org/dashboard"
    pub dashboard_url: Option<String>;

    /// Optional icon or logo URI.
    ///
    /// Example:
    /// - "https://unit09.org/assets/icon.png"
    /// - "ipfs://Qm..."
    pub icon_uri: Option<String>;

    /// Optional extra JSON payload, stored as a string.
    ///
    /// This is intentionally unstructured so frontends can evolve without
    /// requiring on-chain schema migrations.
    ///
    /// Example:
    /// "{ \"theme\": \"wasteland\", \"chapter\": 2 }"
    pub extra_json: Option<String>;
}

/// Accounts required for the `set_metadata` instruction.
///
/// This instruction is admin-only and uses the global `Config` to determine
/// the authorized signer.
#[derive(Accounts)]
pub struct SetMetadata<'info> {
    /// Admin signer authorized to set global metadata.
    ///
    /// Must match `config.admin`.
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Global configuration account.
    ///
    /// PDA:
    ///   seeds = [CONFIG_SEED.as_bytes()]
    ///   bump  = config.bump
    #[account(
        mut,
        seeds = [CONFIG_SEED.as_bytes()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// Lifecycle account controlling global write permissions.
    ///
    /// PDA:
    ///   seeds = [LIFECYCLE_SEED.as_bytes()]
    ///   bump  = lifecycle.bump
    #[account(
        mut,
        seeds = [LIFECYCLE_SEED.as_bytes()],
        bump = lifecycle.bump,
    )]
    pub lifecycle: Account<'info, Lifecycle>,

    /// Global metadata account for this deployment.
    ///
    /// PDA:
    ///   seeds = [GLOBAL_METADATA_SEED.as_bytes()]
    ///   bump  = global_metadata.bump
    ///
    /// This account is created lazily the first time `set_metadata` is called.
    #[account(
        init_if_needed,
        payer = admin,
        space = GlobalMetadata::LEN,
        seeds = [GLOBAL_METADATA_SEED.as_bytes()],
        bump,
    )]
    pub global_metadata: Account<'info, GlobalMetadata>,

    /// System program.
    pub system_program: Program<'info, System>,

    /// Clock sysvar used for timestamps.
    pub clock: Sysvar<'info, Clock>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Entry point for the `set_metadata` instruction.
///
/// Steps:
/// 1. Ensure lifecycle allows writes.
/// 2. Ensure caller is the admin stored in `Config`.
/// 3. Perform field-level validation (length, basic URI sanity).
/// 4. Initialize or update `GlobalMetadata`.
/// 5. Emit `GlobalMetadataUpdated` event.
pub fn handle(ctx: Context<SetMetadata>, args: SetMetadataArgs) -> Result<()> {
    let SetMetadata {
        admin,
        mut config,
        mut lifecycle,
        mut global_metadata,
        system_program: _,
        clock,
    } = ctx.accounts;

    let clock_ref: &Clock = clock;

    // -----------------------------------------------------------------------
    // Guards
    // -----------------------------------------------------------------------

    lifecycle.assert_writes_allowed()?;
    config.assert_admin(admin)?;

    // Optional: require active deployment to change metadata.
    config.assert_active()?;

    // -----------------------------------------------------------------------
    // Early validation on provided fields
    // -----------------------------------------------------------------------

    // Description
    if let Some(ref description) = args.description {
        if description.len() > GlobalMetadata::MAX_DESCRIPTION_LEN {
            return err!(Unit09Error::StringTooLong);
        }
    }

    // Tags
    if let Some(ref tags) = args.tags {
        if tags.len() > GlobalMetadata::MAX_TAGS_LEN {
            return err!(Unit09Error::StringTooLong);
        }
    }

    // Website URL
    if let Some(ref url) = args.website_url {
        if url.len() > GlobalMetadata::MAX_URL_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        if !url.is_empty() && !has_basic_url_prefix(url) {
            return err!(Unit09Error::MetadataInvalid);
        }
    }

    // Docs URL
    if let Some(ref url) = args.docs_url {
        if url.len() > GlobalMetadata::MAX_URL_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        if !url.is_empty() && !has_basic_url_prefix(url) {
            return err!(Unit09Error::MetadataInvalid);
        }
    }

    // Dashboard URL
    if let Some(ref url) = args.dashboard_url {
        if url.len() > GlobalMetadata::MAX_URL_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        if !url.is_empty() && !has_basic_url_prefix(url) {
            return err!(Unit09Error::MetadataInvalid);
        }
    }

    // Icon URI
    if let Some(ref icon_uri) = args.icon_uri {
        if icon_uri.len() > GlobalMetadata::MAX_ICON_URI_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        if !icon_uri.is_empty()
            && !icon_uri.starts_with("http://")
            && !icon_uri.starts_with("https://")
            && !icon_uri.starts_with("ipfs://")
            && !icon_uri.starts_with("ar://")
        {
            return err!(Unit09Error::MetadataInvalid);
        }
    }

    // Extra JSON
    if let Some(ref extra_json) = args.extra_json {
        if extra_json.len() > GlobalMetadata::MAX_EXTRA_JSON_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        // This field is intentionally not parsed on-chain; structure is
        // delegated to off-chain tooling.
    }

    // -----------------------------------------------------------------------
    // Derive bump from Anchor context
    // -----------------------------------------------------------------------

    let metadata_bump = *ctx
        .bumps
        .get("global_metadata")
        .ok_or(Unit09Error::InternalError)?;

    // -----------------------------------------------------------------------
    // Initialize or update GlobalMetadata
    // -----------------------------------------------------------------------

    // If this looks like a fresh account (all-zero description and timestamps),
    // treat it as first-time initialization.
    let is_new = global_metadata.created_at == 0 && global_metadata.updated_at == 0;

    if is_new {
        global_metadata.init(
            args.description.unwrap_or_default(),
            args.tags.unwrap_or_default(),
            args.website_url.unwrap_or_default(),
            args.docs_url.unwrap_or_default(),
            args.dashboard_url.unwrap_or_default(),
            args.icon_uri.unwrap_or_default(),
            args.extra_json.unwrap_or_default(),
            metadata_bump,
            clock_ref,
        )?;
    } else {
        global_metadata.apply_update(
            args.description,
            args.tags,
            args.website_url,
            args.docs_url,
            args.dashboard_url,
            args.icon_uri,
            args.extra_json,
            clock_ref,
        )?;
    }

    // -----------------------------------------------------------------------
    // Emit GlobalMetadataUpdated event
    // -----------------------------------------------------------------------

    emit!(GlobalMetadataUpdated {
        admin: config.admin,
        description: global_metadata.description.clone(),
        website_url: global_metadata.website_url.clone(),
        docs_url: global_metadata.docs_url.clone(),
        dashboard_url: global_metadata.dashboard_url.clone(),
        icon_uri: global_metadata.icon_uri.clone(),
        updated_at: global_metadata.updated_at,
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Basic URL prefix check to reduce obviously malformed URLs.
fn has_basic_url_prefix(url: &str) -> bool {
    url.starts_with("http://") || url.starts_with("https://")
}
