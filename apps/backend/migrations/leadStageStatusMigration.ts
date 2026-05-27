/**
 * Database Migration Script: Normalize Lead Stage and Status
 *
 * This script maps legacy lead stage/status values to the new enums.
 * Run this during a maintenance window with a DB backup.
 */

import Lead from '../models/Lead.model.js';
import { logger } from '../services/logger.service.js';

const MIGRATION_CONFIG = {
  dryRun: process.env.MIGRATION_DRY_RUN === 'true',
};

const LEGACY_STAGE_MAP = {
  'Lead Submitted': 'identified',
  'Lead Verified': 'qualified',
  'Pitch Scheduled': 'qualified',
  'Pitch Completed': 'proposal_shared',
  'PPA Drafting': 'proposal_shared',
  'Commercial Discussions': 'negotiation',
  'Technical Review': 'negotiation',
  'PPA Signed': 'closed',
  'COD Achieved': 'live',
  'First Invoice': 'live',
} as const;

const LEGACY_STATUS_MAP = {
  new: 'Lead Received',
  contacted: 'Under Review',
  qualified: 'Verified',
  proposal_sent: 'Under Review',
  negotiation: 'Under Review',
  converted: 'Verified',
  lost: 'Rejected',
} as const;

type MigrationResult = {
  success: boolean;
  totalMatched: number;
  totalModified: number;
  duration: number;
};

export async function migrateLeadStagesAndStatuses(): Promise<MigrationResult> {
  const startTime = Date.now();

  const legacyStageValues = Object.keys(LEGACY_STAGE_MAP);
  const legacyStatusValues = Object.keys(LEGACY_STATUS_MAP);

  logger.info('Starting lead stage/status migration', {
    dryRun: MIGRATION_CONFIG.dryRun,
    legacyStageValues,
    legacyStatusValues,
  });

  const totalMatched = await Lead.countDocuments({
    $or: [
      { stage: { $in: legacyStageValues } },
      { status: { $in: legacyStatusValues } },
    ],
  });

  if (totalMatched === 0) {
    return {
      success: true,
      totalMatched: 0,
      totalModified: 0,
      duration: Date.now() - startTime,
    };
  }

  if (MIGRATION_CONFIG.dryRun) {
    logger.info('Dry run enabled - no updates applied', { totalMatched });
    return {
      success: true,
      totalMatched,
      totalModified: 0,
      duration: Date.now() - startTime,
    };
  }

  const operations = [
    ...Object.entries(LEGACY_STAGE_MAP).map(([legacy, mapped]) => ({
      updateMany: {
        filter: { stage: legacy },
        update: { $set: { stage: mapped } },
      },
    })),
    ...Object.entries(LEGACY_STATUS_MAP).map(([legacy, mapped]) => ({
      updateMany: {
        filter: { status: legacy },
        update: { $set: { status: mapped } },
      },
    })),
  ];

  const result = await Lead.bulkWrite(operations, { ordered: false });

  return {
    success: true,
    totalMatched,
    totalModified: result.modifiedCount || 0,
    duration: Date.now() - startTime,
  };
}

export default {
  migrateLeadStagesAndStatuses,
};
