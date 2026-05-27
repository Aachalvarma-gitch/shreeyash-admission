import DealMilestone from '../models/DealMilestone.model.js';
import Transaction from '../models/Transaction.model.js';
import GEAWallet from '../models/GEAWallet.model.js';
import GEAPerformance from '../models/GEAPerformance.model.js';
import Lead from '../models/Lead.model.js';
import { logger } from './logger.service.js';

/**
 * Commission rates per MW
 */
const COMMISSION_RATES = {
  solar: 5000, // ₹ per MW
  wind: 6000,
  hybrid: 5500,
} as const;

/**
 * Milestone definitions
 */
const MILESTONES = [
  { name: 'Lead Submitted', commissionPercent: 0 },
  { name: 'Initial Meeting', commissionPercent: 5 },
  { name: 'Site Survey Completed', commissionPercent: 10 },
  { name: 'Proposal Submitted', commissionPercent: 15 },
  { name: 'PPA Signed', commissionPercent: 30 },
  { name: 'COD Achieved', commissionPercent: 40 }, // Final payment
] as const;

/**
 * Calculate commission for a milestone
 */
export const calculateCommission = (lead: any, milestone: string): number => {
  const milestoneDef = MILESTONES.find(m => m.name === milestone);
  if (!milestoneDef) return 0;

  const energyType = lead.energyDetails?.energyType || 'solar';
  const estimatedCapacity = lead.energyDetails?.estimatedCapacityMW || lead.energyDetails?.estimatedCapacityKW || 0;

  const rate = COMMISSION_RATES[energyType as keyof typeof COMMISSION_RATES] || COMMISSION_RATES.solar;
  const baseCommission = rate * estimatedCapacity;

  return (baseCommission * milestoneDef.commissionPercent) / 100;
};

/**
 * Update deal milestones and trigger commission
 */
export const updateDealMilestone = async (dealId: string, milestone: string, geaId: string): Promise<void> => {
  try {
    // Find or create milestone
    let milestoneDoc = await DealMilestone.findOne({ deal: dealId, milestone });
    if (!milestoneDoc) {
      const lead = await Lead.findById(dealId);
      if (!lead) throw new Error('Deal not found');

      const commissionAmount = calculateCommission(lead, milestone);

      milestoneDoc = await DealMilestone.create({
        deal: dealId,
        milestone,
        status: 'achieved',
        commissionAmount,
        achievedAt: new Date(),
      });

      // Trigger commission payment
      if (commissionAmount > 0) {
        await releaseCommission(geaId, commissionAmount, `Commission for ${milestone} on deal ${dealId}`);
      }

      logger.info(`Milestone achieved: ${milestone} for deal ${dealId}, commission: ₹${commissionAmount}`);
    }
  } catch (error) {
    logger.error(`Failed to update milestone ${milestone} for deal ${dealId}:`, error);
    throw error;
  }
};

/**
 * Release commission to GEA wallet
 */
export const releaseCommission = async (geaId: string, amount: number, description: string): Promise<void> => {
  try {
    // Get or create wallet
    let wallet = await GEAWallet.findOne({ user: geaId });
    if (!wallet) {
      wallet = await GEAWallet.create({ user: geaId });
    }

    // Create transaction
    const transaction = await Transaction.create({
      wallet: wallet._id,
      type: 'credit',
      amount,
      description,
      status: 'completed',
    });

    // Update wallet balance
    wallet.balance += amount;
    await wallet.save();

    logger.info(`Commission released to GEA ${geaId}: ₹${amount}`);
  } catch (error) {
    logger.error(`Failed to release commission to GEA ${geaId}:`, error);
    throw error;
  }
};

/**
 * Calculate deal health score
 */
export const calculateDealHealth = (lead: any): 'green' | 'yellow' | 'red' => {
  const now = new Date();
  const createdAt = new Date(lead.createdAt);
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Red: No progress after 30 days
  if (daysSinceCreation > 30 && lead.status === 'Lead Received') return 'red';

  // Yellow: Stagnant for 14 days
  if (daysSinceCreation > 14 && ['Lead Received', 'Under Review'].includes(lead.status)) return 'yellow';

  // Green: Active progress
  return 'green';
};

/**
 * Update GEA performance metrics
 */
export const updateGEAPerformance = async (geaId: string, period: string = 'current_month'): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate metrics
    const leadsSubmitted = await Lead.countDocuments({
      geaId,
      createdAt: { $gte: startOfMonth },
      isDeleted: false,
    });

    const dealsClosed = await Lead.countDocuments({
      geaId,
      stage: { $in: ['closed', 'live'] },
      updatedAt: { $gte: startOfMonth },
      isDeleted: false,
    });

    const commissionEarned = await Transaction.aggregate([
      {
        $match: {
          wallet: (await GEAWallet.findOne({ user: geaId }))?._id,
          type: 'credit',
          status: 'completed',
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalCommission = commissionEarned[0]?.total || 0;
    const conversionRate = leadsSubmitted > 0 ? (dealsClosed / leadsSubmitted) * 100 : 0;

    // Update or create performance record
    await GEAPerformance.findOneAndUpdate(
      { user: geaId, period },
      {
        leadsSubmitted,
        dealsClosed,
        commissionEarned: totalCommission,
        conversionRate,
      },
      { upsert: true, new: true }
    );

    logger.info(`Updated performance for GEA ${geaId}: ${leadsSubmitted} leads, ${dealsClosed} closed, ₹${totalCommission} earned`);
  } catch (error) {
    logger.error(`Failed to update GEA performance for ${geaId}:`, error);
    throw error;
  }
};
