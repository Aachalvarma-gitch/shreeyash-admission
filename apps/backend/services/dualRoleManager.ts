/**
 * Dual Role Management Service
 * Handles subscriber-to-agent conversion and dual role business logic
 */

import mongoose from 'mongoose';
import Subscriber from '../models/Subscriber.model.js';
import Lead from '../models/Lead.model.js';
import User from '../models/User.model.js';
import { BUSINESS_RULES, calculateDualRoleCommissionRate } from '../config/businessRules.js';
import { logger } from './logger.service.js';
import { LeadValidator } from '../utils/leadValidator.js';

export interface DualRoleConversionData {
  agentType: 'individual' | 'company';
  experienceYears?: number;
  territoryInterest?: string[];
  commissionStructure?: {
    baseRate?: number;
    customRates?: Record<string, number>;
  };
}

export interface ConversionEligibilityResult {
  eligible: boolean;
  reasons: string[];
  subscriberAge: number;
  paymentHistory: number;
  recommendedCommissionRate: number;
}

export interface DualRoleCommissionResult {
  eligible: boolean;
  reason?: 'self_referral' | 'family_referral' | 'minimum_period_not_met' | 'validation_failed';
  amount: number;
  rate: number;
  dualRoleAdjustment: boolean;
  tierBonus?: number;
}

export class DualRoleManager {
  /**
   * Check if a subscriber is eligible for dual role conversion
   */
  async checkConversionEligibility(subscriberId: string): Promise<ConversionEligibilityResult> {
    try {
      const subscriber = await Subscriber.findOne({
        _id: subscriberId,
        isDeleted: false
      });

      if (!subscriber) {
        return {
          eligible: false,
          reasons: ['Subscriber not found'],
          subscriberAge: 0,
          paymentHistory: 0,
          recommendedCommissionRate: 0,
        };
      }

      const reasons: string[] = [];
      const subscriberAge = Date.now() - subscriber.createdAt.getTime();

      // Check minimum subscriber period
      const minPeriod = BUSINESS_RULES.dualRole.minimumSubscriberPeriod;
      if (subscriberAge < minPeriod) {
        const remainingDays = Math.ceil((minPeriod - subscriberAge) / (24 * 60 * 60 * 1000));
        reasons.push(`${remainingDays} days remaining until eligible for dual role`);
      }

      // Check if already has agent role
      if (subscriber.hasAgentRole) {
        reasons.push('Subscriber already has agent role');
      }

      // Calculate payment history (placeholder - implement based on your billing system)
      const paymentHistory = await this.calculatePaymentHistory(subscriberId);

      if (paymentHistory < BUSINESS_RULES.dualRole.minimumPaymentHistory) {
        reasons.push(`Payment history ${Math.round(paymentHistory * 100)}% below required ${Math.round(BUSINESS_RULES.dualRole.minimumPaymentHistory * 100)}%`);
      }

      // Check for outstanding dues
      const hasOutstandingDues = await this.checkOutstandingDues(subscriberId);
      if (hasOutstandingDues) {
        reasons.push('Outstanding dues must be cleared');
      }

      const eligible = reasons.length === 0;

      // Calculate recommended commission rate
      const baseRate = BUSINESS_RULES.commission.standardRates.energy_subscriber;
      const recommendedRate = calculateDualRoleCommissionRate(baseRate, 0, 0); // Initial rate

      return {
        eligible,
        reasons,
        subscriberAge,
        paymentHistory,
        recommendedCommissionRate: recommendedRate,
      };

    } catch (error) {
      logger.error('Error checking conversion eligibility:', error);
      return {
        eligible: false,
        reasons: ['System error checking eligibility'],
        subscriberAge: 0,
        paymentHistory: 0,
        recommendedCommissionRate: 0,
      };
    }
  }

  /**
   * Convert a subscriber to dual role (subscriber + agent)
   */
  async convertSubscriberToAgent(
    subscriberId: string,
    conversionData: DualRoleConversionData
  ): Promise<{
    success: boolean;
    agent?: any;
    subscriber?: any;
    errors?: string[];
  }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check eligibility first
      const eligibility = await this.checkConversionEligibility(subscriberId);
      if (!eligibility.eligible) {
        await session.abortTransaction();
        return {
          success: false,
          errors: eligibility.reasons,
        };
      }

        // Get subscriber
      const subscriber = await Subscriber.findById(subscriberId).session(session);
      if (!subscriber) {
        await session.abortTransaction();
        return {
          success: false,
          errors: ['Subscriber not found'],
        };
      }

      // Get the associated user
      const user = await User.findById(subscriber.userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return {
          success: false,
          errors: ['User not found for subscriber'],
        };
      }

      // Check if user already has sales agent role
      const salesAgentRole = await mongoose.model('Role').findOne({ name: 'Sales Agent' }).session(session);
      if (!salesAgentRole) {
        await session.abortTransaction();
        return {
          success: false,
          errors: ['Sales Agent role not found'],
        };
      }

      // Create agent profile data (stored in user model)
      const agentCode = await this.generateAgentCode(conversionData.agentType);
      const agentProfile = {
        agentCode,
        agentType: conversionData.agentType,
        experienceYears: conversionData.experienceYears || 0,
        territoryInterest: conversionData.territoryInterest || [],
        commissionPercentage: conversionData.commissionStructure?.baseRate ||
                             BUSINESS_RULES.commission.standardRates.energy_subscriber,
        startDate: new Date(),
      };

      // Update user with sales agent role and profile
      user.role = salesAgentRole._id;
      user.agentProfile = agentProfile;
      user.updatedAt = new Date();
      await user.save({ session });

      // Update subscriber record
      subscriber.hasAgentRole = true;
      subscriber.agentRoleStartDate = new Date();
      subscriber.updatedBy = subscriber.createdBy;
      await subscriber.save({ session });

      // Update user roles if user model exists
      try {
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(
          subscriber.userId,
          {
            $addToSet: { roles: 'sales_agent' },
            $set: {
              'agentProfile.agentId': agent[0]._id,
              'agentProfile.startDate': new Date(),
            }
          },
          { session }
        );
      } catch (error) {
        logger.warn('User model update failed, continuing without user role update:', error);
      }

      await session.commitTransaction();

      logger.info(`Successfully converted subscriber ${subscriberId} to dual role agent ${user._id}`);

      return {
        success: true,
        agent: user, // Return the user with agent profile
        subscriber,
      };

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error converting subscriber to agent:', error);

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown conversion error'],
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate commission for dual role agent leads
   */
  async calculateDualRoleCommission(
    lead: any,
    user: any
  ): Promise<DualRoleCommissionResult> {
    try {
      // Check if user has dual role (both subscriber and agent)
      const subscriber = await Subscriber.findOne({
        userId: user._id,
        hasAgentRole: true,
        isDeleted: false
      });

      if (!subscriber || !user.agentProfile) {
        // Regular agent - use standard calculation
        return {
          eligible: true,
          amount: lead.estimatedValue * (user.agentProfile?.commissionPercentage || 0) / 100,
          rate: user.agentProfile?.commissionPercentage || 0,
          dualRoleAdjustment: false,
        };
      }

      // Dual role agent - apply special rules

      // Rule 1: Self-referral check
      if (lead.convertedToSubscriberId?.equals(subscriber._id)) {
        return {
          eligible: false,
          reason: 'self_referral',
          amount: 0,
          rate: 0,
          dualRoleAdjustment: true,
        };
      }

      // Rule 2: Family referral check (placeholder - implement based on your data)
      if (await this.isFamilyReferral(lead, subscriber)) {
        return {
          eligible: false,
          reason: 'family_referral',
          amount: 0,
          rate: 0,
          dualRoleAdjustment: true,
        };
      }

      // Calculate commission with dual role adjustments
      const dualRoleAge = Date.now() - subscriber.agentRoleStartDate.getTime();
      const referralCount = await this.getAgentReferralCount(user._id);

      const baseRate = user.agentProfile.commissionPercentage;
      const effectiveRate = calculateDualRoleCommissionRate(
        baseRate,
        dualRoleAge,
        referralCount
      );

      const amount = lead.estimatedValue * (effectiveRate / 100);

      return {
        eligible: true,
        amount,
        rate: effectiveRate,
        dualRoleAdjustment: dualRoleAge < BUSINESS_RULES.dualRole.minimumSubscriberPeriod,
        tierBonus: effectiveRate - baseRate,
      };

    } catch (error) {
      logger.error('Error calculating dual role commission:', error);
      return {
        eligible: false,
        reason: 'validation_failed',
        amount: 0,
        rate: 0,
        dualRoleAdjustment: false,
      };
    }
  }

  /**
   * Get dual role agent performance metrics
   */
  async getDualRoleMetrics(agentId: string): Promise<{
    subscriberSavings: number;
    agentEarnings: number;
    netBenefit: number;
    conversionDate: Date;
    referralCount: number;
    averageCommission: number;
  }> {
    try {
      const agent = await mongoose.model('SalesAgent').findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const subscriber = await Subscriber.findOne({
        userId: agent.userId,
        hasAgentRole: true
      });

      if (!subscriber) {
        throw new Error('Dual role subscriber not found');
      }

      // Get agent leads and commissions
      const agentLeads = await Lead.find({
        'attribution.sourceAgentId': agent._id,
        isDeleted: false
      });

      const totalEarnings = agentLeads.reduce((sum, lead) =>
        sum + (lead.attribution?.commissionEligibility?.calculatedCommission || 0), 0
      );

      // Calculate subscriber savings (placeholder)
      const subscriberSavings = await this.calculateSubscriberSavings(subscriber._id);

      return {
        subscriberSavings,
        agentEarnings: totalEarnings,
        netBenefit: totalEarnings - subscriberSavings,
        conversionDate: subscriber.agentRoleStartDate,
        referralCount: agentLeads.length,
        averageCommission: agentLeads.length > 0 ? totalEarnings / agentLeads.length : 0,
      };

    } catch (error) {
      logger.error('Error getting dual role metrics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async calculatePaymentHistory(subscriberId: string): Promise<number> {
    // Placeholder - implement based on your billing/payment system
    // Return payment success rate (0.0 to 1.0)
    return 0.95; // Default good payment history
  }

  private async checkOutstandingDues(subscriberId: string): Promise<boolean> {
    // Placeholder - implement based on your billing system
    return false; // No outstanding dues
  }

  private async generateAgentCode(agentType: 'individual' | 'company'): Promise<string> {
    const prefix = agentType === 'company' ? 'AGCMP' : 'AGIND';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    return `${prefix}${timestamp}${random}`;
  }

  private async isFamilyReferral(lead: any, subscriber: any): Promise<boolean> {
    // Placeholder - implement family relationship checking
    // Check if lead contact shares last name, address, etc.
    return false;
  }

  private async getAgentReferralCount(agentId: string): Promise<number> {
    const referralCount = await Lead.countDocuments({
      'attribution.sourceAgentId': agentId,
      'attribution.commissionEligibility.isEligible': true,
      isDeleted: false
    });

    return referralCount;
  }

  private async calculateSubscriberSavings(subscriberId: string): Promise<number> {
    // Placeholder - calculate savings from energy efficiency measures
    return 0;
  }
}