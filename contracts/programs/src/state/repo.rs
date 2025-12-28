//! ===========================================================================
//! Unit09 – Repository State
//! Path: contracts/unit09-program/programs/unit09_program/src/state/repo.rs
//!
//! A repository represents a real-world codebase that Unit09 observes and
//! modularizes into runnable units. It is the primary anchor for:
//! - tracking code sources
//! - counting observations
//! - aggregating module statistics
//!
//! Each `Repo` is a PDA derived from:
//!     seed: REPO_SEED
//!     key:  repo_key (arbitrary Pubkey chosen by the caller)
//!
//! This module defines:
//! - `Repo` account structure
//! - size constants for rent-exempt allocation
//! - helper methods for authority checks, activation checks,
//!   observation recording, and module counters.
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::Unit09Error;

/// Repository account tracked by Unit09.
///
/// A repository may represent:
/// - a GitHub / GitLab repository
/// - a monorepo with multiple on-chain programs
/// - any logical grouping of code that Unit09 parses
#[account]
pub struct Repo {
    /// Arbitrary key chosen to identify this repository at PDA derivation time.
    ///
    /// In most cases this will be derived from an off-chain identifier
    /// (for example, the hash of a repository URL or a content identifier).
    pub repo_key: Pubkey,

    /// Authority that controls metadata and activation state for this repository.
    pub authority: Pubkey,

    /// Human-readable name for the repository.
    ///
    /// Example: "unit09-solana-core"
    pub name: String,

    /// URL pointing to the codebase.
    ///
    /// Example: "https://github.com/unit09-labs/unit09"
    pub url: String,

    /// Optional tags describing the repository.
    ///
    /// Example: "solana,anchor,protocol"
    pub tags: String,

    /// Whether this repository is active.
    ///
    /// Inactive repositories should not be observed or used for new
    /// module registrations.
    pub is_active: bool,

    /// Whether Unit09’s external workers are allowed to perform
    /// automated observation runs for this repository.
    pub allow_observation: bool,

    /// Total number of modules registered for this repository.
    pub module_count: u32,

    /// Total number of observation runs recorded for this repository.
    pub observation_count: u64,

    /// Aggregated lines of code processed across all observations.
    pub total_lines_of_code: u64,

    /// Aggregated files processed across all observations.
    pub total_files_processed: u64,

    /// Unix timestamp when this repository entry was created.
    pub created_at: i64,

    /// Unix timestamp when this repository entry was last updated.
    pub updated_at: i64,

    /// Schema version for this repository layout.
    pub schema_version: u8,

    /// Bump used for PDA derivation.
    pub bump: u8,

    /// Reserved space for future fields.
    pub reserved: [u8; 62],
}

impl Repo {
    /// Discriminator length used by Anchor.
    pub const DISCRIMINATOR_LEN: usize = 8;

    /// Maximum length of the `name` field in bytes (UTF-8).
    pub const MAX_NAME_LEN: usize = MAX_NAME_LEN;

    /// Maximum length of the `url` field in bytes (UTF-8).
    pub const MAX_URL_LEN: usize = MAX_URL_LEN;

    /// Maximum length of the `tags` field in bytes (UTF-8).
    pub const MAX_TAGS_LEN: usize = MAX_REPO_TAGS_LEN;

    /// Total serialized length of the `Repo` account.
    ///
    /// String fields are stored as a 4-byte length prefix followed by bytes.
    /// We allocate the maximum size to keep the layout stable.
    pub const LEN: usize = Self::DISCRIMINATOR_LEN
        + 32  // repo_key: Pubkey
        + 32  // authority: Pubkey
        + 4 + Self::MAX_NAME_LEN // name: String
        + 4 + Self::MAX_URL_LEN  // url: String
        + 4 + Self::MAX_TAGS_LEN // tags: String
        + 1  // is_active: bool
        + 1  // allow_observation: bool
        + 4  // module_count: u32
        + 8  // observation_count: u64
        + 8  // total_lines_of_code: u64
        + 8  // total_files_processed: u64
        + 8  // created_at: i64
        + 8  // updated_at: i64
        + 1  // schema_version: u8
        + 1  // bump: u8
        + 62; // reserved: [u8; 62]

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initialize a new repository with the given parameters.
    ///
    /// This is typically called from the `register_repo` instruction.
    pub fn init(
        &mut self,
        repo_key: Pubkey,
        authority: Pubkey,
        name: String,
        url: String,
        tags: String,
        allow_observation: bool,
        bump: u8,
        clock: &Clock,
    ) -> Result<()> {
        Self::validate_name(&name)?;
        Self::validate_url(&url)?;
        Self::validate_tags(&tags)?;

        self.repo_key = repo_key;
        self.authority = authority;
        self.name = name;
        self.url = url;
        self.tags = tags;
        self.is_active = true;
        self.allow_observation = allow_observation;
        self.module_count = 0;
        self.observation_count = 0;
        self.total_lines_of_code = 0;
        self.total_files_processed = 0;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.schema_version = CURRENT_SCHEMA_VERSION;
        self.bump = bump;
        self.reserved = [0u8; 62];

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Metadata Updates
    // -----------------------------------------------------------------------

    /// Update the repository metadata fields that are provided as `Some`.
    ///
    /// This can be used by `update_repo` and similar instructions.
    pub fn apply_update(
        &mut self,
        maybe_name: Option<String>,
        maybe_url: Option<String>,
        maybe_tags: Option<String>,
        maybe_is_active: Option<bool>,
        maybe_allow_observation: Option<bool>,
        clock: &Clock,
    ) -> Result<()> {
        if let Some(name) = maybe_name {
            Self::validate_name(&name)?;
            self.name = name;
        }

        if let Some(url) = maybe_url {
            Self::validate_url(&url)?;
            self.url = url;
        }

        if let Some(tags) = maybe_tags {
            Self::validate_tags(&tags)?;
            self.tags = tags;
        }

        if let Some(is_active) = maybe_is_active {
            self.is_active = is_active;
        }

        if let Some(allow_obs) = maybe_allow_observation {
            self.allow_observation = allow_obs;
        }

        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Authority and Activation Guards
    // -----------------------------------------------------------------------

    /// Ensure that the given signer is the authority for this repository.
    pub fn assert_authority(&self, signer: &Signer) -> Result<()> {
        if signer.key() != self.authority {
            return err!(Unit09Error::InvalidAuthority);
        }
        Ok(())
    }

    /// Ensure that the repository is currently active.
    pub fn assert_active(&self) -> Result<()> {
        if !self.is_active {
            return err!(Unit09Error::RepoInactive);
        }
        Ok(())
    }

    /// Ensure that the repository is allowed to be observed.
    pub fn assert_observation_allowed(&self) -> Result<()> {
        if !self.allow_observation {
            return err!(Unit09Error::ObservationNotAllowed);
        }
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Module Counters
    // -----------------------------------------------------------------------

    /// Increment the module count for this repository.
    ///
    /// This should be called when a new module is successfully registered.
    pub fn increment_module_count(&mut self) -> Result<()> {
        let new_value = self
            .module_count
            .checked_add(1)
            .ok_or(Unit09Error::CounterOverflow)?;

        if new_value > DEFAULT_MAX_MODULES_PER_REPO {
            return err!(Unit09Error::RepoModuleLimitReached);
        }

        self.module_count = new_value;
        Ok(())
    }

    /// Decrement the module count for this repository, used if you ever add
    /// soft-deletion or archival of modules.
    pub fn decrement_module_count(&mut self) -> Result<()> {
        self.module_count = self
            .module_count
            .checked_sub(1)
            .ok_or(Unit09Error::CounterOverflow)?;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Observation Aggregation
    // -----------------------------------------------------------------------

    /// Record a single observation result on this repository.
    ///
    /// This is used by `record_observation` instruction handlers.
    pub fn record_observation(
        &mut self,
        lines_of_code: u64,
        files_processed: u32,
    ) -> Result<()> {
        // Basic bounds checking using constants
        if lines_of_code > MAX_LOC_PER_OBSERVATION {
            return err!(Unit09Error::ObservationDataTooLarge);
        }
        if files_processed as u64 > MAX_FILES_PER_OBSERVATION as u64 {
            return err!(Unit09Error::ObservationDataTooLarge);
        }

        // Increment observation count
        self.observation_count = self
            .observation_count
            .checked_add(1)
            .ok_or(Unit09Error::CounterOverflow)?;

        if self.observation_count > SOFT_MAX_OBSERVATIONS_PER_REPO {
            return err!(Unit09Error::RepoObservationLimitReached);
        }

        // Aggregate lines of code and files
        self.total_lines_of_code = self
            .total_lines_of_code
            .checked_add(lines_of_code)
            .ok_or(Unit09Error::CounterOverflow)?;

        self.total_files_processed = self
            .total_files_processed
            .checked_add(files_processed as u64)
            .ok_or(Unit09Error::CounterOverflow)?;

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Validation Helpers
    // -----------------------------------------------------------------------

    /// Validate the repository name.
    fn validate_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return err!(Unit09Error::StringEmpty);
        }
        if name.len() > Self::MAX_NAME_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        Ok(())
    }

    /// Validate the repository URL with basic checks.
    fn validate_url(url: &str) -> Result<()> {
        if url.is_empty() {
            return err!(Unit09Error::StringEmpty);
        }
        if url.len() > Self::MAX_URL_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        // Very basic structural check: must contain at least one dot and "://"
        if !url.contains("://") || !url.contains('.') {
            return err!(Unit09Error::InvalidUrl);
        }
        Ok(())
    }

    /// Validate the tags string.
    fn validate_tags(tags: &str) -> Result<()> {
        if tags.len() > Self::MAX_TAGS_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        Ok(())
    }
}
//! ===========================================================================
//! Unit09 – Repository State
//! Path: contracts/unit09-program/programs/unit09_program/src/state/repo.rs
//!
//! A repository represents a real-world codebase that Unit09 observes and
//! modularizes into runnable units. It is the primary anchor for:
//! - tracking code sources
//! - counting observations
//! - aggregating module statistics
//!
//! Each `Repo` is a PDA derived from:
//!     seed: REPO_SEED
//!     key:  repo_key (arbitrary Pubkey chosen by the caller)
//!
//! This module defines:
//! - `Repo` account structure
//! - size constants for rent-exempt allocation
//! - helper methods for authority checks, activation checks,
//!   observation recording, and module counters.
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::Unit09Error;

/// Repository account tracked by Unit09.
///
/// A repository may represent:
/// - a GitHub / GitLab repository
/// - a monorepo with multiple on-chain programs
/// - any logical grouping of code that Unit09 parses
#[account]
pub struct Repo {
    /// Arbitrary key chosen to identify this repository at PDA derivation time.
    ///
    /// In most cases this will be derived from an off-chain identifier
    /// (for example, the hash of a repository URL or a content identifier).
    pub repo_key: Pubkey,

    /// Authority that controls metadata and activation state for this repository.
    pub authority: Pubkey,

    /// Human-readable name for the repository.
    ///
    /// Example: "unit09-solana-core"
    pub name: String,

    /// URL pointing to the codebase.
    ///
    /// Example: "https://github.com/unit09-labs/unit09"
    pub url: String,

    /// Optional tags describing the repository.
    ///
    /// Example: "solana,anchor,protocol"
    pub tags: String,

    /// Whether this repository is active.
    ///
    /// Inactive repositories should not be observed or used for new
    /// module registrations.
    pub is_active: bool,

    /// Whether Unit09’s external workers are allowed to perform
    /// automated observation runs for this repository.
    pub allow_observation: bool,

    /// Total number of modules registered for this repository.
    pub module_count: u32,

    /// Total number of observation runs recorded for this repository.
    pub observation_count: u64,

    /// Aggregated lines of code processed across all observations.
    pub total_lines_of_code: u64,

    /// Aggregated files processed across all observations.
    pub total_files_processed: u64,

    /// Unix timestamp when this repository entry was created.
    pub created_at: i64,

    /// Unix timestamp when this repository entry was last updated.
    pub updated_at: i64,

    /// Schema version for this repository layout.
    pub schema_version: u8,

    /// Bump used for PDA derivation.
    pub bump: u8,

    /// Reserved space for future fields.
    pub reserved: [u8; 62],
}

impl Repo {
    /// Discriminator length used by Anchor.
    pub const DISCRIMINATOR_LEN: usize = 8;

    /// Maximum length of the `name` field in bytes (UTF-8).
    pub const MAX_NAME_LEN: usize = MAX_NAME_LEN;

    /// Maximum length of the `url` field in bytes (UTF-8).
    pub const MAX_URL_LEN: usize = MAX_URL_LEN;

    /// Maximum length of the `tags` field in bytes (UTF-8).
    pub const MAX_TAGS_LEN: usize = MAX_REPO_TAGS_LEN;

    /// Total serialized length of the `Repo` account.
    ///
    /// String fields are stored as a 4-byte length prefix followed by bytes.
    /// We allocate the maximum size to keep the layout stable.
    pub const LEN: usize = Self::DISCRIMINATOR_LEN
        + 32  // repo_key: Pubkey
        + 32  // authority: Pubkey
        + 4 + Self::MAX_NAME_LEN // name: String
        + 4 + Self::MAX_URL_LEN  // url: String
        + 4 + Self::MAX_TAGS_LEN // tags: String
        + 1  // is_active: bool
        + 1  // allow_observation: bool
        + 4  // module_count: u32
        + 8  // observation_count: u64
        + 8  // total_lines_of_code: u64
        + 8  // total_files_processed: u64
        + 8  // created_at: i64
        + 8  // updated_at: i64
        + 1  // schema_version: u8
        + 1  // bump: u8
        + 62; // reserved: [u8; 62]

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initialize a new repository with the given parameters.
    ///
    /// This is typically called from the `register_repo` instruction.
    pub fn init(
        &mut self,
        repo_key: Pubkey,
        authority: Pubkey,
        name: String,
        url: String,
        tags: String,
        allow_observation: bool,
        bump: u8,
        clock: &Clock,
    ) -> Result<()> {
        Self::validate_name(&name)?;
        Self::validate_url(&url)?;
        Self::validate_tags(&tags)?;

        self.repo_key = repo_key;
        self.authority = authority;
        self.name = name;
        self.url = url;
        self.tags = tags;
        self.is_active = true;
        self.allow_observation = allow_observation;
        self.module_count = 0;
        self.observation_count = 0;
        self.total_lines_of_code = 0;
        self.total_files_processed = 0;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.schema_version = CURRENT_SCHEMA_VERSION;
        self.bump = bump;
        self.reserved = [0u8; 62];

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Metadata Updates
    // -----------------------------------------------------------------------

    /// Update the repository metadata fields that are provided as `Some`.
    ///
    /// This can be used by `update_repo` and similar instructions.
    pub fn apply_update(
        &mut self,
        maybe_name: Option<String>,
        maybe_url: Option<String>,
        maybe_tags: Option<String>,
        maybe_is_active: Option<bool>,
        maybe_allow_observation: Option<bool>,
        clock: &Clock,
    ) -> Result<()> {
        if let Some(name) = maybe_name {
            Self::validate_name(&name)?;
            self.name = name;
        }

        if let Some(url) = maybe_url {
            Self::validate_url(&url)?;
            self.url = url;
        }

        if let Some(tags) = maybe_tags {
            Self::validate_tags(&tags)?;
            self.tags = tags;
        }

        if let Some(is_active) = maybe_is_active {
            self.is_active = is_active;
        }

        if let Some(allow_obs) = maybe_allow_observation {
            self.allow_observation = allow_obs;
        }

        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Authority and Activation Guards
    // -----------------------------------------------------------------------

    /// Ensure that the given signer is the authority for this repository.
    pub fn assert_authority(&self, signer: &Signer) -> Result<()> {
        if signer.key() != self.authority {
            return err!(Unit09Error::InvalidAuthority);
        }
        Ok(())
    }

    /// Ensure that the repository is currently active.
    pub fn assert_active(&self) -> Result<()> {
        if !self.is_active {
            return err!(Unit09Error::RepoInactive);
        }
        Ok(())
    }

    /// Ensure that the repository is allowed to be observed.
    pub fn assert_observation_allowed(&self) -> Result<()> {
        if !self.allow_observation {
            return err!(Unit09Error::ObservationNotAllowed);
        }
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Module Counters
    // -----------------------------------------------------------------------

    /// Increment the module count for this repository.
    ///
    /// This should be called when a new module is successfully registered.
    pub fn increment_module_count(&mut self) -> Result<()> {
        let new_value = self
            .module_count
            .checked_add(1)
            .ok_or(Unit09Error::CounterOverflow)?;

        if new_value > DEFAULT_MAX_MODULES_PER_REPO {
            return err!(Unit09Error::RepoModuleLimitReached);
        }

        self.module_count = new_value;
        Ok(())
    }

    /// Decrement the module count for this repository, used if you ever add
    /// soft-deletion or archival of modules.
    pub fn decrement_module_count(&mut self) -> Result<()> {
        self.module_count = self
            .module_count
            .checked_sub(1)
            .ok_or(Unit09Error::CounterOverflow)?;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Observation Aggregation
    // -----------------------------------------------------------------------

    /// Record a single observation result on this repository.
    ///
    /// This is used by `record_observation` instruction handlers.
    pub fn record_observation(
        &mut self,
        lines_of_code: u64,
        files_processed: u32,
    ) -> Result<()> {
        // Basic bounds checking using constants
        if lines_of_code > MAX_LOC_PER_OBSERVATION {
            return err!(Unit09Error::ObservationDataTooLarge);
        }
        if files_processed as u64 > MAX_FILES_PER_OBSERVATION as u64 {
            return err!(Unit09Error::ObservationDataTooLarge);
        }

        // Increment observation count
        self.observation_count = self
            .observation_count
            .checked_add(1)
            .ok_or(Unit09Error::CounterOverflow)?;

        if self.observation_count > SOFT_MAX_OBSERVATIONS_PER_REPO {
            return err!(Unit09Error::RepoObservationLimitReached);
        }

        // Aggregate lines of code and files
        self.total_lines_of_code = self
            .total_lines_of_code
            .checked_add(lines_of_code)
            .ok_or(Unit09Error::CounterOverflow)?;

        self.total_files_processed = self
            .total_files_processed
            .checked_add(files_processed as u64)
            .ok_or(Unit09Error::CounterOverflow)?;

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Validation Helpers
    // -----------------------------------------------------------------------

    /// Validate the repository name.
    fn validate_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return err!(Unit09Error::StringEmpty);
        }
        if name.len() > Self::MAX_NAME_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        Ok(())
    }

    /// Validate the repository URL with basic checks.
    fn validate_url(url: &str) -> Result<()> {
        if url.is_empty() {
            return err!(Unit09Error::StringEmpty);
        }
        if url.len() > Self::MAX_URL_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        // Very basic structural check: must contain at least one dot and "://"
        if !url.contains("://") || !url.contains('.') {
            return err!(Unit09Error::InvalidUrl);
        }
        Ok(())
    }

    /// Validate the tags string.
    fn validate_tags(tags: &str) -> Result<()> {
        if tags.len() > Self::MAX_TAGS_LEN {
            return err!(Unit09Error::StringTooLong);
        }
        Ok(())
    }
}
