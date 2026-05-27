/**
 * Database Migration Script: Rename Roles to GEA/GES/GEP
 *
 * This script safely migrates existing roles and updates user references.
 * Run this script during a maintenance window with full database backup.
 */

import mongoose from 'mongoose';
import Role from '../models/Role.model.js';
import User from '../models/User.model.js';
import { logger } from '../services/logger.service.js';

/**
 * Migration configuration
 */
const MIGRATION_CONFIG = {
  dryRun: process.env.MIGRATION_DRY_RUN === 'true', // Set to true for testing
  backupEnabled: true,
};

/**
 * Role mapping
 */
const ROLE_MAPPING = {
  'Sales Agent': 'GEA',
  'Energy Subscriber': 'GES',
  'Energy Partner': 'GEP',
} as const;

/**
 * Main migration function
 */
export async function migrateRoles(): Promise<{
  success: boolean;
  rolesUpdated: number;
  usersUpdated: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  logger.info(`Starting role migration... Dry run: ${MIGRATION_CONFIG.dryRun}`);

  const errors: string[] = [];
  let rolesUpdated = 0;
  let usersUpdated = 0;

  try {
    // Update role names
    for (const [oldName, newName] of Object.entries(ROLE_MAPPING)) {
      try {
        const oldRole = await Role.findOne({ name: oldName });
        if (!oldRole) {
          logger.warn(`Old role '${oldName}' not found, skipping`);
          continue;
        }

        const existingNewRole = await Role.findOne({ name: newName });
        if (existingNewRole) {
          logger.warn(`New role '${newName}' already exists, skipping rename`);
          continue;
        }

        if (!MIGRATION_CONFIG.dryRun) {
          await Role.updateOne({ _id: oldRole._id }, { name: newName });
          logger.info(`Renamed role '${oldName}' to '${newName}'`);
          rolesUpdated++;
        } else {
          logger.info(`[DRY RUN] Would rename role '${oldName}' to '${newName}'`);
        }
      } catch (error) {
        const msg = `Error updating role '${oldName}': ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    // Update user role references
    for (const [oldName, newName] of Object.entries(ROLE_MAPPING)) {
      try {
        const oldRole = await Role.findOne({ name: MIGRATION_CONFIG.dryRun ? oldName : newName });
        const newRole = await Role.findOne({ name: newName });

        if (!newRole) {
          errors.push(`New role '${newName}' not found after update`);
          continue;
        }

        const usersToUpdate = await User.find({ role: oldRole?._id });
        if (usersToUpdate.length === 0) {
          logger.info(`No users found with old role '${oldName}'`);
          continue;
        }

        if (!MIGRATION_CONFIG.dryRun) {
          await User.updateMany({ role: oldRole?._id }, { role: newRole._id });
          logger.info(`Updated ${usersToUpdate.length} users from role '${oldName}' to '${newName}'`);
          usersUpdated += usersToUpdate.length;
        } else {
          logger.info(`[DRY RUN] Would update ${usersToUpdate.length} users from role '${oldName}' to '${newName}'`);
        }
      } catch (error) {
        const msg = `Error updating users for role '${oldName}': ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    logger.info(`Role migration completed. Success: ${success}, Roles updated: ${rolesUpdated}, Users updated: ${usersUpdated}, Errors: ${errors.length}, Duration: ${duration}ms, Dry run: ${MIGRATION_CONFIG.dryRun}`);

    return {
      success,
      rolesUpdated,
      usersUpdated,
      errors,
      duration,
    };

  } catch (error) {
    logger.error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      rolesUpdated: 0,
      usersUpdated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Rollback function (only works if backup was enabled)
 */
export async function rollbackRoleMigration(): Promise<{
  success: boolean;
  message: string;
}> {
  // Implementation would depend on backup strategy
  logger.warn('Rollback functionality not implemented yet');
  return {
    success: false,
    message: 'Rollback functionality not implemented. Please restore from backup.',
  };
}

// Export for CLI usage
export default {
  migrateRoles,
  rollbackRoleMigration,
};