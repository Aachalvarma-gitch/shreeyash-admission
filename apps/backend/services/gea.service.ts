import SystemSettings from '../models/SystemSettings.model';
import { getDealWorkflowConfig, getWalletConfig, getPerformanceConfig } from '../config/businessRules';

// Updated Commission Service with Dynamic Configuration
export class GEACommissionService {
  
  // Dynamic commission calculation
  static async calculateGEACommission(leadData: any) {
    const commissionPercentage = await SystemSettings.findOne({
      category: 'commission',
      key: 'gea_commission_percentage'
    });
    
    const percentage = (commissionPercentage?.value || 10) / 100;
    return leadData.estimatedValue * percentage;
  }

  // Dynamic milestone commission calculation
  static async calculateMilestoneCommission(milestoneName: string, dealValue: number) {
    const workflowConfig = await getDealWorkflowConfig();
    const milestone = workflowConfig.milestones.find(m => m.name === milestoneName);
    
    if (!milestone) return 0;
    return dealValue * (milestone.commissionPercent / 100);
  }

  // Dynamic commission validation
  static async validateCommissionAmount(amount: number) {
    const walletConfig = await getWalletConfig();
    return amount >= walletConfig.minimumWithdrawalAmount;
  }

  // Get dynamic commission processing time
  static async getCommissionProcessingDays() {
    const walletConfig = await getWalletConfig();
    return walletConfig.commissionReleaseDelayDays;
  }

  // Calculate total potential commission for a deal
  static async calculateTotalCommissionPotential(dealValue: number, category: string) {
    const { getCommissionConfig } = await import('../config/businessRules');
    const commissionConfig = await getCommissionConfig();
    
    const baseRate = commissionConfig.standardRates[category as keyof typeof commissionConfig.standardRates] || 3.0;
    return dealValue * (baseRate / 100);
  }

  // Calculate commission with tiered bonuses
  static async calculateCommissionWithBonus(leadData: any, referralCount: number = 0) {
    const commissionConfig = await getCommissionConfig();
    let commissionRate = commissionConfig.standardRates[leadData.category as keyof typeof commissionConfig.standardRates] || 3.0;
    
    // Apply tiered bonuses if enabled
    if (commissionConfig.enableTieredBonuses) {
      const tiers = commissionConfig.tieredBonusRates;
      if (referralCount >= tiers.tier4.minReferrals) {
        commissionRate += tiers.tier4.bonus;
      } else if (referralCount >= tiers.tier3.minReferrals) {
        commissionRate += tiers.tier3.bonus;
      } else if (referralCount >= tiers.tier2.minReferrals) {
        commissionRate += tiers.tier2.bonus;
      }
    }
    
    return leadData.estimatedValue * (commissionRate / 100);
  }
}

// Updated Deal Service with Dynamic Configuration
export class GEADealService {
  
  // Get dynamic deal stages from settings
  static async getDealStages() {
    const workflowConfig = await getDealWorkflowConfig();
    return workflowConfig.defaultStageSequence;
  }

  // Calculate deal performance metrics
  static async calculateDealPerformance(dealData: any) {
    const performanceConfig = await getPerformanceConfig();
    const targetDays = performanceConfig.targetConversionTimeDays;
    const actualDays = this.calculateDaysToCurrentStage(dealData);
    
    return {
      isOnTrack: actualDays <= targetDays,
      performanceScore: Math.max(0, 100 - ((actualDays - targetDays) / targetDays) * 100),
      daysAhead: Math.max(0, targetDays - actualDays),
      daysBehind: Math.max(0, actualDays - targetDays),
    };
  }

  // Get next expected milestone
  static async getNextMilestone(currentStage: string) {
    const workflowConfig = await getDealWorkflowConfig();
    const currentIndex = workflowConfig.defaultStageSequence.indexOf(currentStage);
    return workflowConfig.defaultStageSequence[currentIndex + 1];
  }

  // Get milestone progress
  static async getMilestoneProgress(dealData: any) {
    const workflowConfig = await getDealWorkflowConfig();
    const currentStageIndex = workflowConfig.defaultStageSequence.indexOf(dealData.stage);
    const totalStages = workflowConfig.defaultStageSequence.length;
    
    return {
      currentStage: dealData.stage,
      currentStageIndex,
      totalStages,
      progressPercentage: Math.round(((currentStageIndex + 1) / totalStages) * 100),
      completedMilestones: workflowConfig.defaultStageSequence.slice(0, currentStageIndex + 1),
      upcomingMilestones: workflowConfig.defaultStageSequence.slice(currentStageIndex + 1)
    };
  }

  // Calculate expected completion date
  static async calculateExpectedCompletionDate(dealData: any) {
    const workflowConfig = await getDealWorkflowConfig();
    const averageDaysPerStage = workflowConfig.automaticStageTransitionDays;
    const currentStageIndex = workflowConfig.defaultStageSequence.indexOf(dealData.stage);
    const remainingStages = workflowConfig.defaultStageSequence.length - currentStageIndex - 1;
    
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + (remainingStages * averageDaysPerStage));
    
    return expectedDate;
  }

  private static calculateDaysToCurrentStage(dealData: any): number {
    const createdDate = new Date(dealData.createdAt);
    const currentDate = new Date();
    return Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Updated Performance Service with Dynamic Configuration
export class GEAPerformanceService {
  
  // Calculate GEA performance metrics
  static async calculatePerformanceMetrics(geaData: any) {
    const config = await getPerformanceConfig();
    
    const leadsThisMonth = geaData.leads.filter((lead: any) => this.isThisMonth(lead.createdAt)).length;
    const dealsThisMonth = geaData.deals.filter((deal: any) => this.isThisMonth(deal.createdAt)).length;
    const totalLeads = geaData.leads.length;
    const totalDeals = geaData.deals.length;
    const totalCommission = geaData.commissions.reduce((sum: number, comm: any) => sum + comm.amount, 0);
    
    return {
      leadsThisMonth,
      dealsThisMonth,
      totalLeads,
      totalDeals,
      conversionRatio: totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 100) : 0,
      avgTimeToClose: this.calculateAvgTimeToClose(geaData.deals),
      targetAchievementPercent: this.calculateTargetAchievement(totalCommission, config.targetMonthlyCommission),
      starGEAStatus: totalDeals >= config.starGEAMinDeals,
      topPerformerStatus: false, // Would need comparison with other GEAs
      monthlyPerformance: this.calculateMonthlyPerformance(geaData),
    };
  }

  // Get performance benchmarks
  static async getPerformanceBenchmarks() {
    const config = await getPerformanceConfig();
    
    return {
      minLeadsPerMonth: config.minLeadsPerMonth,
      targetConversionTimeDays: config.targetConversionTimeDays,
      targetMonthlyCommission: config.targetMonthlyCommission,
      starGEAMinDeals: config.starGEAMinDeals,
      topPerformerThresholdPercent: config.topPerformerThresholdPercent,
      targetDealsPerMonth: config.targetDealsPerMonth,
      targetConversionRate: config.targetConversionRate,
    };
  }

  // Calculate performance trend
  static async calculatePerformanceTrends(geaId: string, months: number = 6) {
    // This would typically query the database for historical data
    const trends = [];
    const currentDate = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      
      // In a real implementation, these would be database queries
      trends.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        leads: Math.floor(Math.random() * 20) + 5,
        deals: Math.floor(Math.random() * 8) + 1,
        commissions: Math.floor(Math.random() * 50000) + 10000,
        conversionRate: Math.floor(Math.random() * 30) + 10,
      });
    }

    return trends;
  }

  // Generate performance insights
  static async generatePerformanceInsights(metrics: any) {
    const insights = [];
    
    if (metrics.leadsThisMonth < 10) {
      insights.push({
        type: 'warning',
        title: 'Lead Generation Low',
        message: 'You\'re below the minimum target of 10 leads per month. Focus on increasing lead generation activities.',
        action: 'Increase outreach activities'
      });
    }
    
    if (metrics.conversionRatio < 20) {
      insights.push({
        type: 'info',
        title: 'Conversion Rate Improvement',
        message: 'Your conversion rate is below average. Consider reviewing your sales approach.',
        action: 'Review sales techniques'
      });
    }
    
    if (metrics.targetAchievementPercent > 100) {
      insights.push({
        type: 'success',
        title: 'Target Achieved',
        message: 'Congratulations! You\'ve exceeded your monthly target.',
        action: 'Maintain current performance'
      });
    }
    
    return insights;
  }

  private static isThisMonth(date: Date): boolean {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  private static calculateAvgTimeToClose(deals: any[]): number {
    if (deals.length === 0) return 0;
    const totalDays = deals.reduce((sum, deal) => sum + this.calculateDealDays(deal), 0);
    return Math.round(totalDays / deals.length);
  }

  private static calculateDealDays(deal: any): number {
    const created = new Date(deal.createdAt);
    const closed = new Date(deal.closedAt || Date.now());
    return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static calculateTargetAchievement(commission: number, target: number): number {
    return Math.min(100, Math.round((commission / target) * 100));
  }

  private static calculateMonthlyPerformance(geaData: any) {
    // Group by month and calculate performance
    const monthlyData = {};
    
    geaData.leads.forEach((lead: any) => {
      const month = new Date(lead.createdAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { leads: 0, deals: 0, commission: 0 };
      }
      monthlyData[month].leads++;
    });
    
    geaData.deals.forEach((deal: any) => {
      const month = new Date(deal.createdAt).toISOString().slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].deals++;
      }
    });
    
    geaData.commissions.forEach((commission: any) => {
      const month = new Date(commission.createdAt).toISOString().slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].commission += commission.amount;
      }
    });
    
    return monthlyData;
  }
}

// Updated Wallet Service with Dynamic Configuration
export class GEAWalletService {
  
  // Process withdrawal request with dynamic validation
  static async processWithdrawal(geaId: string, amount: number) {
    const walletConfig = await getWalletConfig();
    
    if (amount < walletConfig.minimumWithdrawalAmount) {
      throw new Error(`Minimum withdrawal amount is ₹${walletConfig.minimumWithdrawalAmount}`);
    }

    // Process withdrawal with dynamic processing time
    const processingDays = walletConfig.withdrawalProcessingDays;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + processingDays);

    return {
      amount,
      processingDays,
      expectedDate,
      status: 'processing',
    };
  }

  // Get wallet balance threshold alert
  static async getBalanceThreshold() {
    const walletConfig = await getWalletConfig();
    return walletConfig.walletBalanceThresholdAlert;
  }

  // Check if auto withdrawal is enabled
  static async isAutoWithdrawalEnabled() {
    const walletConfig = await getWalletConfig();
    return walletConfig.autoWithdrawalEnabled;
  }

  // Calculate wallet summary
  static async calculateWalletSummary(geaId: string) {
    // In a real implementation, these would be database queries
    return {
      totalCommissionEarned: 250000,
      availableBalance: 75000,
      pendingApproval: 25000,
      totalWithdrawn: 150000,
      lastWithdrawal: new Date('2024-01-15'),
      nextWithdrawalAvailable: new Date(),
      commissionHistory: [],
      withdrawalHistory: [],
    };
  }

  // Validate withdrawal eligibility
  static async validateWithdrawalEligibility(geaId: string, amount: number) {
    const walletConfig = await getWalletConfig();
    const walletSummary = await this.calculateWalletSummary(geaId);
    
    return {
      isEligible: amount >= walletConfig.minimumWithdrawalAmount && amount <= walletSummary.availableBalance,
      minimumAmount: walletConfig.minimumWithdrawalAmount,
      availableBalance: walletSummary.availableBalance,
      errors: this.getWithdrawalErrors(amount, walletSummary.availableBalance, walletConfig.minimumWithdrawalAmount)
    };
  }

  private static getWithdrawalErrors(requestedAmount: number, availableBalance: number, minimumAmount: number): string[] {
    const errors = [];
    
    if (requestedAmount < minimumAmount) {
      errors.push(`Amount must be at least ₹${minimumAmount}`);
    }
    
    if (requestedAmount > availableBalance) {
      errors.push(`Insufficient balance. Available: ₹${availableBalance}`);
    }
    
    return errors;
  }
}