//! ===========================================================================
//! Unit09 – Lifecycle State
//! Path: contracts/unit09-program/programs/unit09_program/src/state/lifecycle.rs
//!
//! The Lifecycle account models the high-level operational state of a Unit09
//! deployment. While `Config` focuses on parameters (fees, limits, admin),
//! `Lifecycle` focuses on *phases* and *global switches*, such as:
//!
//! - whether the deployment is in normal operation
//! - whether write operations should be frozen
//! - whether a migration is required or in progress
//!
//! Typical usage:
//! - Gate high-risk or admin-sensitive instructions behind lifecycle checks
//! - Mark the deployment as read-only during audits or migrations
//! - Emit lifecycle events when phases change
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::Unit09Error;

/// High-level lifecycle phases for a Unit09 deployment.
///
/// These values are encoded as a `u8` in the `Lifecycle` account. You can
/// extend this enum in future versions as long as the numeric mapping is
/// kept stable or migrated explicitly.
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LifecyclePhase {
    /// Initial bootstrapping phase; configuration and initial setup.
    Bootstrapping = 0,
    /// Normal operation; all expected instructions may be executed.
    Operational = 1,
    /// Restricted operation; only a subset of instructions are allowed.
    Maintenance = 2,
    /// Read-only phase; write instructions should be blocked.
    Frozen = 3,
    /// Migration in progress; only migration-related instructions allowed.
    Migration = 4,
    /// Sunset phase; protocol is effectively shut down for new activity.
    Sunset = 5,
}

impl LifecyclePhase {
    /// Convert from raw `u8` to `LifecyclePhase`.
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(LifecyclePhase::Bootstrapping),
            1 => Some(LifecyclePhase::Operational),
            2 => Some(LifecyclePhase::Maintenance),
            3 => Some(LifecyclePhase::Frozen),
            4 => Some(LifecyclePhase::Migration),
            5 => Some(LifecyclePhase::Sunset),
            _ => None,
        }
    }

    /// Convert `LifecyclePhase` to raw `u8`.
    pub fn as_u8(self) -> u8 {
        self as u8
    }

    /// Returns true if this phase is considered write-restricted.
    pub fn is_write_restricted(self) -> bool {
        matches!(
            self,
            LifecyclePhase::Frozen | LifecyclePhase::Migration | LifecyclePhase::Sunset
        )
    }

    /// Returns true if this phase should be treated as read-only by default.
    pub fn is_read_only(self) -> bool {
        matches!(self, LifecyclePhase::Frozen | LifecyclePhase::Sunset)
    }
}

/// Lifecycle account for a Unit09 deployment.
///
/// This is a PDA derived from the fixed seed `LIFECYCLE_SEED` and the
/// program ID.
#[account]
pub struct Lifecycle {
    /// Current lifecycle phase encoded as a raw `u8` mapping to `LifecyclePhase`.
    pub phase: u8,

    /// Whether write operations are globally frozen, regardless of phase.
    ///
    /// This flag can be used for emergency freezes. Even if the phase is
    /// `Operational`, a global freeze may still be in effect.
    pub global_freeze: bool,

    /// Whether a migration is required before non-trivial instructions can
    /// be executed.
    pub migration_required: bool,

    /// Whether a migration is currently in progress.
    pub migration_in_progress: bool,

    /// Unix timestamp when the current phase was entered.
    pub phase_changed_at: i64,

    /// Unix timestamp when the last migration flag was set or cleared.
    pub migration_state_changed_at: i64,

    /// Optional reference (hash or opaque bytes) to an off-chain note,
    /// such as a governance proposal or migration document.
    pub note_ref: [u8; 32],

    /// Creation timestamp (Unix seconds) for this lifecycle account.
    pub created_at: i64,

    /// Last update timestamp (Unix seconds) for any field change.
    pub updated_at: i64,

    /// Schema version for this account layout.
    pub schema_version: u8,

    /// Bump used for PDA derivation.
    pub bump: u8,

    /// Reserved bytes for future upgrades.
    pub reserved: [u8; 77],
}

impl Lifecycle {
    /// Discriminator length used by Anchor.
    pub const DISCRIMINATOR_LEN: usize = 8;

    /// Total serialized length for the `Lifecycle` account.
    pub const LEN: usize = Self::DISCRIMINATOR_LEN
        + 1  // phase: u8
        + 1  // global_freeze: bool
        + 1  // migration_required: bool
        + 1  // migration_in_progress: bool
        + 8  // phase_changed_at: i64
        + 8  // migration_state_changed_at: i64
        + 32 // note_ref: [u8; 32]
        + 8  // created_at: i64
        + 8  // updated_at: i64
        + 1  // schema_version: u8
        + 1  // bump: u8
        + 77; // reserved: [u8; 77]

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initialize a new lifecycle account in the `Bootstrapping` phase.
    pub fn init(&mut self, bump: u8, clock: &Clock, note_ref: [u8; 32]) -> Result<()> {
        let now = clock.unix_timestamp;

        self.phase = LifecyclePhase::Bootstrapping.as_u8();
        self.global_freeze = false;
        self.migration_required = false;
        self.migration_in_progress = false;
        self.phase_changed_at = now;
        self.migration_state_changed_at = 0;
        self.note_ref = note_ref;
        self.created_at = now;
        self.updated_at = now;
        self.schema_version = CURRENT_SCHEMA_VERSION;
        self.bump = bump;
        self.reserved = [0u8; 77];

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Phase and State Updates
    // -----------------------------------------------------------------------

    /// Change the lifecycle phase in a controlled way.
    ///
    /// This should be called by an admin-only instruction that has already
    /// verified the caller’s authority.
    pub fn set_phase(&mut self, new_phase: LifecyclePhase, clock: &Clock) -> Result<()> {
        let old_phase = LifecyclePhase::from_u8(self.phase)
            .ok_or(Unit09Error::InvalidLifecycleState)?;

        // No-op if the phase is unchanged.
        if old_phase == new_phase {
            return Ok(());
        }

        self.phase = new_phase.as_u8();
        self.phase_changed_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    /// Set or clear the global freeze flag.
    pub fn set_global_freeze(&mut self, freeze: bool, clock: &Clock) -> Result<()> {
        self.global_freeze = freeze;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Mark that a migration is required before certain instructions may run.
    pub fn require_migration(&mut self, clock: &Clock) -> Result<()> {
        self.migration_required = true;
        self.migration_state_changed_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Mark migration as in progress.
    pub fn start_migration(&mut self, clock: &Clock) -> Result<()> {
        if !self.migration_required {
            // Migration should not start if it was never required.
            return err!(Unit09Error::MigrationRequired);
        }
        if self.migration_in_progress {
            return err!(Unit09Error::MigrationAlreadyApplied);
        }

        self.migration_in_progress = true;
        self.phase = LifecyclePhase::Migration.as_u8();
        self.phase_changed_at = clock.unix_timestamp;
        self.migration_state_changed_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    /// Mark migration as completed.
    ///
    /// Typically, after migration is complete, the phase returns to
    /// `Operational`, but that policy is decided by the caller.
    pub fn complete_migration(&mut self, new_phase: LifecyclePhase, clock: &Clock) -> Result<()> {
        if !self.migration_in_progress {
            return err!(Unit09Error::MigrationRequired);
        }

        self.migration_required = false;
        self.migration_in_progress = false;
        self.phase = new_phase.as_u8();
        let now = clock.unix_timestamp;
        self.phase_changed_at = now;
        self.migration_state_changed_at = now;
        self.updated_at = now;

        Ok(())
    }

    /// Update the note reference (for example, pointing to a new governance
    /// proposal or lifecycle document).
    pub fn update_note_ref(&mut self, note_ref: [u8; 32], clock: &Clock) -> Result<()> {
        self.note_ref = note_ref;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Guards for Instruction Handlers
    // -----------------------------------------------------------------------

    /// Ensure that write operations are allowed in the current lifecycle state.
    ///
    /// This can be called at the beginning of instructions that mutate
    /// important state (repositories, modules, forks, metrics).
    pub fn assert_writes_allowed(&self) -> Result<()> {
        let phase = LifecyclePhase::from_u8(self.phase)
            .ok_or(Unit09Error::InvalidLifecycleState)?;

        // If a global freeze is active, no writes are allowed.
        if self.global_freeze {
            return err!(Unit09Error::InvalidLifecycleState);
        }

        // If the current phase is write-restricted, block the operation.
        if phase.is_write_restricted() {
            return err!(Unit09Error::InvalidLifecycleState);
        }

        // If a migration is required but not in progress, block writes.
        if self.migration_required && !self.migration_in_progress {
            return err!(Unit09Error::MigrationRequired);
        }

        Ok(())
    }

    /// Convenience function to check whether this lifecycle is effectively
    /// read-only (either by phase or by freeze).
    pub fn is_effectively_read_only(&self) -> Result<bool> {
        let phase = LifecyclePhase::from_u8(self.phase)
            .ok_or(Unit09Error::InvalidLifecycleState)?;

        Ok(self.global_freeze || phase.is_read_only())
    }
}
