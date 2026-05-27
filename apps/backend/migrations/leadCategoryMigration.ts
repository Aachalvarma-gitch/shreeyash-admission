/**
 * Database Migration Script: Agricultural Leads → Energy Business Categories
 *
 * This script safely migrates existing agricultural farm leads to the new energy business categories.
 * Run this script during a maintenance window with full database backup.
 */

import mongoose from 'mongoose';
import Lead from '../models/Lead.model.js';
import { logger } from '../services/logger.service.js';

/**
 * Migration configuration
 */
const MIGRATION_CONFIG = {
  batchSize: 100, // Process leads in batches to avoid memory issues
  dryRun: process.env.MIGRATION_DRY_RUN === 'true', // Set to true for testing
  backupEnabled: true,
};

/**
 * Category mapping from agricultural to energy business
 */
const CATEGORY_MAPPING = {
  dairy: 'solar_farm',
  poultry: 'wind_farm',
  crop: 'hybrid_farm',
  mixed: 'energy_subscriber',
} as const;

/**
 * Energy type mapping based on farm size
 */
const ENERGY_TYPE_MAPPING = {
  small: 'solar', // < 10 acres
  medium: 'hybrid', // 10-50 acres
  large: 'wind', // > 50 acres
} as const;

/**
 * Get energy type based on farm size
 */
function getEnergyType(farmSize?: number): string {
  if (!farmSize) return 'solar';

  if (farmSize < 10) return ENERGY_TYPE_MAPPING.small;
  if (farmSize < 50) return ENERGY_TYPE_MAPPING.medium;
  return ENERGY_TYPE_MAPPING.large;
}

/**
 * Calculate estimated capacity based on farm size and energy type
 */
function calculateEstimatedCapacity(farmSize: number, energyType: string): number {
  const capacityFactors = {
    solar: 1.5, // MW per acre for solar
    wind: 2.0,  // MW per acre for wind
    hybrid: 1.8, // MW per acre for hybrid
  };

  const factor = capacityFactors[energyType as keyof typeof capacityFactors] || 1.5;
  return Math.round(farmSize * factor * 100) / 100; // Round to 2 decimal places
}

/**
 * Transform a single lead document
 */
function transformLead(lead: any): any {
  const { farmType, farmSize, ...existingFields } = lead;

  // Determine new category
  const leadCategory = CATEGORY_MAPPING[farmType as keyof typeof CATEGORY_MAPPING] || 'energy_subscriber';

  // Build energy details based on category
  const energyDetails: any = {};

  if (['solar_farm', 'wind_farm', 'hybrid_farm'].includes(leadCategory)) {
    // Energy generation leads
    const energyType = getEnergyType(farmSize);
    const estimatedCapacity = calculateEstimatedCapacity(farmSize || 0, energyType);

    energyDetails.estimatedCapacityMW = estimatedCapacity;
    energyDetails.landArea = farmSize || 0;
    energyDetails.energyType = energyType;
    energyDetails.locationType = 'ground_mounted';
  } else if (leadCategory === 'energy_subscriber') {
    // Subscriber leads - use default values, can be updated later
    energyDetails.currentConsumption = 500; // Default 500 kWh/month
    energyDetails.connectionType = 'residential';
  }

  // Initialize attribution with default values
  const attribution = {
    sourceAgentId: existingFields.geaId,
    agentRoleContext: 'pure_agent', // Default assumption
    commissionEligibility: {
      isEligible: true, // Will be recalculated by business logic
      calculatedCommission: 0,
    },
  };

  return {
    ...existingFields,
    leadCategory,
    energyDetails,
    attribution,
    // Remove old fields
    farmType: undefined,
    farmSize: undefined,
  };
}

/**
 * Validate transformed lead data
 */
function validateTransformedLead(lead: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields validation
  if (!lead.leadCategory) {
    errors.push('leadCategory is required');
  }

  // Category-specific validation
  if (['solar_farm', 'wind_farm', 'hybrid_farm'].includes(lead.leadCategory)) {
    if (!lead.energyDetails?.estimatedCapacityMW || lead.energyDetails.estimatedCapacityMW <= 0) {
      errors.push('estimatedCapacityMW must be greater than 0 for energy generation leads');
    }
    if (!lead.energyDetails?.landArea || lead.energyDetails.landArea <= 0) {
      errors.push('landArea must be greater than 0 for energy generation leads');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Process leads in batches
 */
async function processBatch(leadIds: string[]): Promise<{
  processed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const processed = [];
    const errors = [];

    for (const leadId of leadIds) {
      try {
        const lead = await Lead.findById(leadId).session(session);
        if (!lead) {
          errors.push({ id: leadId, error: 'Lead not found' });
          continue;
        }

        // Skip if already migrated
        if (lead.leadCategory) {
          logger.info(`Lead ${leadId} already migrated, skipping`);
          continue;
        }

        const transformedLead = transformLead(lead.toObject());
        const validation = validateTransformedLead(transformedLead);

        if (!validation.isValid) {
          errors.push({
            id: leadId,
            error: `Validation failed: ${validation.errors.join(', ')}`
          });
          continue;
        }

        if (!MIGRATION_CONFIG.dryRun) {
          await Lead.findByIdAndUpdate(leadId, transformedLead, { session });
        }

        processed.push(leadId);
        logger.info(`Migrated lead ${leadId} to category ${transformedLead.leadCategory}`);

      } catch (error) {
        errors.push({
          id: leadId,
          error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        logger.error(`Failed to migrate lead ${leadId}:`, error);
      }
    }

    if (!MIGRATION_CONFIG.dryRun) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    return { processed: processed.length, errors };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Main migration function
 */
export async function migrateLeadCategories(): Promise<{
  success: boolean;
  totalProcessed: number;
  totalErrors: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}> {
  const startTime = Date.now();
  logger.info('Starting lead category migration...', {
    dryRun: MIGRATION_CONFIG.dryRun,
    batchSize: MIGRATION_CONFIG.batchSize,
  });

  try {
    // Get all leads that need migration (have farmType but no leadCategory)
    const leadsToMigrate = await Lead.find({
      farmType: { $exists: true },
      leadCategory: { $exists: false },
      isDeleted: false,
    }).select('_id').lean();

    const totalLeads = leadsToMigrate.length;
    logger.info(`Found ${totalLeads} leads to migrate`);

    if (totalLeads === 0) {
      logger.info('No leads found for migration');
      return {
        success: true,
        totalProcessed: 0,
        totalErrors: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    // Process in batches
    const leadIds = leadsToMigrate.map(lead => lead._id.toString());
    const batches = [];
    for (let i = 0; i < leadIds.length; i += MIGRATION_CONFIG.batchSize) {
      batches.push(leadIds.slice(i, i + MIGRATION_CONFIG.batchSize));
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const allErrors: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} leads)`);

      const result = await processBatch(batch);
      totalProcessed += result.processed;
      totalErrors += result.errors.length;
      allErrors.push(...result.errors);

      // Progress logging
      const progress = Math.round(((i + 1) / batches.length) * 100);
      logger.info(`Progress: ${progress}% (${totalProcessed}/${totalLeads} processed, ${totalErrors} errors)`);
    }

    const duration = Date.now() - startTime;
    const success = totalErrors === 0;

    logger.info('Migration completed', {
      success,
      totalProcessed,
      totalErrors,
      duration: `${duration}ms`,
      dryRun: MIGRATION_CONFIG.dryRun,
    });

    return {
      success,
      totalProcessed,
      totalErrors,
      errors: allErrors,
      duration,
    };

  } catch (error) {
    logger.error('Migration failed:', error);
    return {
      success: false,
      totalProcessed: 0,
      totalErrors: 1,
      errors: [{ id: 'migration', error: error instanceof Error ? error.message : 'Unknown error' }],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Rollback function (only works if backup was enabled)
 */
export async function rollbackLeadMigration(): Promise<{
  success: boolean;
  message: string;
}> {
  // Implementation would depend on backup strategy
  // This is a placeholder for rollback functionality
  logger.warn('Rollback functionality not implemented yet');
  return {
    success: false,
    message: 'Rollback functionality not implemented. Please restore from backup.',
  };
}

// Export for CLI usage
export default {
  migrateLeadCategories,
  rollbackLeadMigration,
};