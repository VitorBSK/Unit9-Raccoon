//! ===========================================================================
//! Unit09 – Authority and Role State
//! Path: contracts/unit09-program/programs/unit09_program/src/state/authority.rs
//!
//! This module defines the on-chain representation of authorities and roles
//! used by the Unit09 protocol.
//!
//! While basic authority checks can be implemented purely by storing a single
//! `Pubkey` on each state account (`Config::admin`, `Repo::authority`,
//! `Module::authority`, `Fork::owner`), a dedicated `Authority` account
//! provides a centralized, role-based view that off-chain tooling can index.
//!
//! Responsibilities:
//! - Map authority public keys to role bitmasks (admin, maintainer, observer)
//! - Track which resources an authority is scoped to (global or per-repo)
//! - Provide helpers for:
//!     * checking roles
//!     * checking whether a role applies to a specific target
//!     * role assignment and revocation
//!
//! ===========================================================================

use anchor_lang::prelude::*;

use crate::errors::Unit09Error;

/// Roles are represented as a bitmask for compact storage and flexible checks.
///
/// Multiple roles can be combined using bitwise OR:
/// - ADMIN | MAINTAINER
/// - MAINTAINER | OBSERVER
///
/// These constants define the standard roles used in the protocol. Off-chain
/// tooling can interpret them for governance and UI.
pub mod role_flags {
    pub const ADMIN: u64 = 1 << 0;
    pub const MAINTAINER: u64 = 1 << 1;
    pub const OBSERVER: u64 = 1 << 2;

    /// Convenience mask for "any role".
    pub const ANY: u64 = ADMIN | MAINTAINER | OBSERVER;
}

/// Authority account tracked by Unit09.
///
/// This account is a PDA derived from a seed and the authority public key:
///
///    seed: "authority"
///    key:  authority_pubkey
///
/// It represents the protocol-level roles that a given authority holds.
#[account]
pub struct Authority {
    /// The public key that this authority entry represents.
    pub authority: Pubkey,

    /// Bitmask of roles assigned to this authority.
    ///
    /// See `role_flags` for available roles.
    pub roles: u64,

    /// Optional resource scope for this authority entry.
    ///
    /// When `is_global` is true, this authority definition applies to the
    /// entire deployment. When false, `resource_scope` defines which
    /// resource this authority is scoped to (for example, a specific repo).
    pub is_global: bool,

    /// Optional resource scope key.
    ///
    /// Example uses:
    /// - repo authority scope
    /// - module authority scope
    ///
    /// If `is_global` is true, this field is typically all zeros.
    pub resource_scope: Pubkey,

    /// Unix timestamp when this authority entry was created.
    pub created_at: i64,

    /// Unix timestamp when this authority entry was last updated.
    pub updated_at: i64,

    /// Schema version for this account layout.
    pub schema_version: u8,

    /// Bump used for PDA derivation.
    pub bump: u8,

    /// Reserved bytes for future upgrades.
    pub reserved: [u8; 62],
}

impl Authority {
    /// Discriminator length used by Anchor.
    pub const DISCRIMINATOR_LEN: usize = 8;

    /// Total serialized length for the `Authority` account.
    pub const LEN: usize = Self::DISCRIMINATOR_LEN
        + 32 // authority: Pubkey
        + 8  // roles: u64
        + 1  // is_global: bool
        + 32 // resource_scope: Pubkey
        + 8  // created_at: i64
        + 8  // updated_at: i64
        + 1  // schema_version: u8
        + 1  // bump: u8
        + 62; // reserved: [u8; 62]

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initialize a new authority entry.
    ///
    /// This is typically called from an admin-only instruction that assigns
    /// roles to an authority for the first time.
    pub fn init(
        &mut self,
        authority: Pubkey,
        roles: u64,
        is_global: bool,
        resource_scope: Pubkey,
        bump: u8,
        clock: &Clock,
    ) -> Result<()> {
        Self::validate_roles(roles)?;

        let now = clock.unix_timestamp;

        self.authority = authority;
        self.roles = roles;
        self.is_global = is_global;
        self.resource_scope = if is_global {
            Pubkey::default()
        } else {
            resource_scope
        };
        self.created_at = now;
        self.updated_at = now;
        self.schema_version = 1;
        self.bump = bump;
        self.reserved = [0u8; 62];

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Role Management
    // -----------------------------------------------------------------------

    /// Assign one or more roles (bitwise OR) to this authority.
    ///
    /// This operation is additive and does not clear existing roles unless
    /// explicitly requested via `clear_roles`.
    pub fn grant_roles(&mut self, roles_to_grant: u64, clock: &Clock) -> Result<()> {
        Self::validate_roles(roles_to_grant)?;

        self.roles |= roles_to_grant;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Revoke one or more roles from this authority.
    ///
    /// Roles to revoke are cleared from the bitmask.
    pub fn revoke_roles(&mut self, roles_to_revoke: u64, clock: &Clock) -> Result<()> {
        self.roles &= !roles_to_revoke;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Replace the current role set entirely with a new bitmask.
    pub fn set_roles(&mut self, new_roles: u64, clock: &Clock) -> Result<()> {
        Self::validate_roles(new_roles)?;
        self.roles = new_roles;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Clear all roles from this authority, effectively disabling it.
    pub fn clear_roles(&mut self, clock: &Clock) -> Result<()> {
        self.roles = 0;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Scope Management
    // -----------------------------------------------------------------------

    /// Update the scope of this authority entry.
    ///
    /// When `is_global` is true, the `resource_scope` is set to the default
    /// (all zeros) and should be ignored by consumers.
    pub fn set_scope(
        &mut self,
        is_global: bool,
        resource_scope: Pubkey,
        clock: &Clock,
    ) -> Result<()> {
        self.is_global = is_global;
        self.resource_scope = if is_global {
            Pubkey::default()
        } else {
            resource_scope
        };
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Role Checks
    // -----------------------------------------------------------------------

    /// Returns true if this authority entry has at least one of the requested
    /// roles in its bitmask.
    pub fn has_any_role(&self, roles_mask: u64) -> bool {
        self.roles & roles_mask != 0
    }

    /// Returns true if this authority entry has all of the requested roles.
    pub fn has_all_roles(&self, roles_mask: u64) -> bool {
        (self.roles & roles_mask) == roles_mask
    }

    /// Returns true if this entry applies to the given resource.
    ///
    /// Resource scoping rules:
    /// - if `is_global` is true, this entry applies to all resources
    /// - otherwise it applies only when `resource_scope` matches `target`
    pub fn matches_resource(&self, target: &Pubkey) -> bool {
        if self.is_global {
            true
        } else {
            &self.resource_scope == target
        }
    }

    /// Check whether the given signer, represented by this authority entry,
    /// is allowed to perform an action requiring any of the roles in
    /// `required_roles` on a specific resource.
    pub fn assert_allowed_for_resource(
        &self,
        signer: &Signer,
        required_roles: u64,
        resource: &Pubkey,
    ) -> Result<()> {
        if signer.key() != self.authority {
            return err!(Unit09Error::InvalidAuthority);
        }
        if !self.matches_resource(resource) {
            return err!(Unit09Error::AuthorityRoleNotAllowed);
        }
        if !self.has_any_role(required_roles) {
            return err!(Unit09Error::AuthorityRoleNotAllowed);
        }
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Validation Helpers
    // -----------------------------------------------------------------------

    /// Validate that a roles bitmask contains only known roles.
    fn validate_roles(roles: u64) -> Result<()> {
        let known_mask = role_flags::ANY;

        if roles & !known_mask != 0 {
            // Unknown bits are set; treat this as invalid.
            return err!(Unit09Error::AuthorityRoleNotAllowed);
        }

        Ok(())
    }
}
