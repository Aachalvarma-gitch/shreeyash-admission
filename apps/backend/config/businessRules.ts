

import SystemSettings from '../models/SystemSettings.js';

export const BUSINESS_RULES = {
  dualRole: {
    minimumSubscriberPeriod: 6 * 30 * 24 * 60 * 60 * 1000,
    transitionCommissionRate: 0.7,
    selfReferralBan: true,
    familyReferralBan: true,
    minimumPaymentHistory: 0.95,
  },

  leadCategories: {
    solar_farm: {
      requiresCapacity: true,
      requiresLandArea: true,
      minimumCapacityMW: 0.1,
      maximumCapacityMW: 100,
      minimumLandArea: 1, // acres
    },
    wind_farm: {
      requiresCapacity: true,
      requiresLandArea: true,
      minimumCapacityMW: 0.1,
      maximumCapacityMW: 200,
      minimumLandArea: 2, // acres
    },
    hybrid_farm: {
      requiresCapacity: true,
      requiresLandArea: true,
      minimumCapacityMW: 0.1,
      maximumCapacityMW: 150,
      minimumLandArea: 1.5,
    },
    gea: {
      requiresAgentType: true,
      minimumExperienceYears: 0,
      maximumExperienceYears: 50,
    },
    ges: {
      requiresConsumption: true,
      requiresConnectionType: true,
      minimumConsumption: 50,
      maximumConsumption: 100000,
    },
  },

  commission: {
    standardRates: {
      solar_farm: 3.0,
      wind_farm: 3.5,
      hybrid_farm: 4.0,
      gea: 5.0,
      ges: 2.5,
    },
    tieredBonusRates: {
      tier1: { minReferrals: 0, bonus: 0 },
      tier2: { minReferrals: 10, bonus: 0.5 },
      tier3: { minReferrals: 25, bonus: 1.0 },
      tier4: { minReferrals: 50, bonus: 1.5 },
    },
  },

  validation: {
    email: {
      required: true,
      format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    mobile: {
      required: true,
      format: /^[6-9]\d{9}$/,
      minLength: 10,
      maxLength: 10,
    },
    estimatedValue: {
      min: 0,
      max: 10000000,
    },
  },

  attribution: {
    commissionCalculationMethods: {
      percentage: 'percentage',
      fixed: 'fixed',
      tiered: 'tiered',
    },
    auditTrail: {
      enableDetailedLogging: true,
      retainHistoryMonths: 24,
    },
  },
} as const;

export type LeadCategory = keyof typeof BUSINESS_RULES.leadCategories;
export type CommissionCalculationMethod = keyof typeof BUSINESS_RULES.attribution.commissionCalculationMethods;


export function getCategoryRules(category: LeadCategory) {
  return BUSINESS_RULES.leadCategories[category];
}


export function isDualRoleEligible(subscriberAge: number, paymentHistory: number = 1): boolean {
  const ageEligible = subscriberAge >= BUSINESS_RULES.dualRole.minimumSubscriberPeriod;
  const paymentEligible = paymentHistory >= BUSINESS_RULES.dualRole.minimumPaymentHistory;
  return ageEligible && paymentEligible;
}


export function calculateDualRoleCommissionRate(
  baseRate: number,
  dualRoleAge: number,
  referralCount: number = 0
): number {
  let effectiveRate = baseRate;


  const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
  if (dualRoleAge < sixMonths) {
    effectiveRate *= BUSINESS_RULES.dualRole.transitionCommissionRate;
  }


  const tiers = BUSINESS_RULES.commission.tieredBonusRates;
  if (referralCount >= tiers.tier4.minReferrals) {
    effectiveRate += tiers.tier4.bonus;
  } else if (referralCount >= tiers.tier3.minReferrals) {
    effectiveRate += tiers.tier3.bonus;
  } else if (referralCount >= tiers.tier2.minReferrals) {
    effectiveRate += tiers.tier2.bonus;
  }

  return effectiveRate;
}


export async function getCommissionRates() {
  const rates = await SystemSettings.find({
    category: 'commission',
    key: { $in: ['solar_farm_rate', 'wind_farm_rate', 'hybrid_farm_rate', 'gea_rate', 'ges_rate'] }
  });

  const settings: Record<string, number> = {};
  rates.forEach(rate => {
    settings[rate.key] = rate.value;
  });

  return {
    solar_farm: settings.solar_farm_rate || 3.0,
    wind_farm: settings.wind_farm_rate || 3.5,
    hybrid_farm: settings.hybrid_farm_rate || 4.0,
    gea: settings.gea_rate || 5.0,
    ges: settings.ges_rate || 2.5,
  };
}


export async function getTieredBonusConfig() {
  const config = await SystemSettings.find({
    category: 'commission',
    key: { $regex: '^tier[2-4]_(min_referrals|bonus_rate)$' }
  });

  const settings: Record<string, number> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    tier1: { minReferrals: 0, bonus: 0 },
    tier2: { minReferrals: settings.tier2_min_referrals || 10, bonus: settings.tier2_bonus_rate || 0.5 },
    tier3: { minReferrals: settings.tier3_min_referrals || 25, bonus: settings.tier3_bonus_rate || 1.0 },
    tier4: { minReferrals: settings.tier4_min_referrals || 50, bonus: settings.tier4_bonus_rate || 1.5 },
  };
}


export async function getCommissionConfig() {
  const [rates, tieredConfig] = await Promise.all([
    getCommissionRates(),
    getTieredBonusConfig()
  ]);

  const enableTieredBonuses = await SystemSettings.findOne({
    category: 'commission',
    key: 'enable_tiered_bonuses'
  });

  return {
    standardRates: rates,
    tieredBonusRates: tieredConfig,
    enableTieredBonuses: enableTieredBonuses?.value || true,
  };
}


export async function getPerformanceConfig() {
  const config = await SystemSettings.find({
    category: 'gea_performance'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    minLeadsPerMonth: settings.min_leads_per_month || 10,
    targetConversionTimeDays: settings.target_conversion_time_days || 45,
    targetMonthlyCommission: settings.target_monthly_commission || 50000,
    performanceReviewFrequencyDays: settings.performance_review_frequency_days || 30,
    starGEAMinDeals: settings.star_gea_min_deals || 5,
    topPerformerThresholdPercent: settings.top_performer_threshold_percent || 90,
    targetDealsPerMonth: settings.target_deals_per_month || 3,
    targetConversionRate: settings.target_conversion_rate || 30,
  };
}


export async function getDealWorkflowConfig() {
  const config = await SystemSettings.find({
    category: 'gea_deals'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    milestones: [
      { name: 'Lead Submitted', commissionPercent: settings.lead_submitted_milestone_commission || 0 },
      { name: 'Initial Meeting', commissionPercent: settings.initial_meeting_milestone_commission || 5 },
      { name: 'Site Survey Completed', commissionPercent: settings.site_survey_milestone_commission || 10 },
      { name: 'Proposal Submitted', commissionPercent: settings.proposal_milestone_commission || 15 },
      { name: 'PPA Signed', commissionPercent: settings.ppa_signed_milestone_commission || 30 },
      { name: 'COD Achieved', commissionPercent: settings.cod_milestone_commission || 40 },
    ],
    defaultStageSequence: settings.default_deal_stage_sequence || [
      'Lead Submitted', 'Initial Meeting', 'Site Survey Completed',
      'Proposal Submitted', 'PPA Drafting', 'Commercial Discussions',
      'Technical Review', 'PPA Signed', 'COD Achieved'
    ],
    automaticStageTransitionDays: settings.deal_automatic_stage_transition_days || 7,
  };
}


export async function getWalletConfig() {
  const config = await SystemSettings.find({
    category: 'gea_wallet'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    minimumWithdrawalAmount: settings.minimum_withdrawal_amount || 1000,
    withdrawalProcessingDays: settings.withdrawal_processing_days || 5,
    autoWithdrawalEnabled: settings.auto_withdrawal_enabled || false,
    walletBalanceThresholdAlert: settings.wallet_balance_threshold_alert || 5000,
    commissionReleaseDelayDays: settings.commission_release_delay_days || 2,
  };
}


export async function getUIConfig() {
  const config = await SystemSettings.find({
    category: 'gea_ui'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    dealTypes: {
      OA: settings.deal_type_oa_color || 'bg-blue-100 text-blue-800',
      GEOA: settings.deal_type_geoa_color || 'bg-green-100 text-green-800',
      VNM: settings.deal_type_vnm_color || 'bg-purple-100 text-purple-800',
      Captive: settings.deal_type_captive_color || 'bg-orange-100 text-orange-800',
      PPA: settings.deal_type_ppa_color || 'bg-cyan-100 text-cyan-800',
    },
    dealStages: {
      'Lead Submitted': settings.stage_lead_submitted_color || 'bg-gray-100 text-gray-800',
      'Pitch Scheduled': settings.stage_pitch_scheduled_color || 'bg-yellow-100 text-yellow-800',
      'PPA Drafting': settings.stage_ppa_drafting_color || 'bg-blue-100 text-blue-800',
      'Commercial Discussions': settings.stage_commercial_discussions_color || 'bg-purple-100 text-purple-800',
      'Technical Review': settings.stage_technical_review_color || 'bg-indigo-100 text-indigo-800',
      'PPA Signed': settings.stage_ppa_signed_color || 'bg-green-100 text-green-800',
      'COD Achieved': settings.stage_cod_achieved_color || 'bg-emerald-100 text-emerald-800',
    },
    commissionStatuses: {
      Pending: settings.commission_pending_color || 'bg-yellow-100 text-yellow-800',
      Approved: settings.commission_approved_color || 'bg-blue-100 text-blue-800',
      Paid: settings.commission_paid_color || 'bg-green-100 text-green-800',
      Cancelled: settings.commission_cancelled_color || 'bg-red-100 text-red-800',
    },
  };
}


export async function getTrainingConfig() {
  const config = await SystemSettings.find({
    category: 'gea_training'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    requiredModules: settings.required_training_modules || [
      'Introduction to Solar Energy', 'Understanding PPA Agreements',
      'Customer Communication Skills', 'Sales Process Training'
    ],
    completionThresholdPercent: settings.training_completion_threshold_percent || 80,
    reminderFrequencyDays: settings.training_reminder_frequency_days || 3,
    onboardingPeriodDays: settings.onboarding_period_days || 30,
  };
}


export async function getNotificationConfig() {
  const config = await SystemSettings.find({
    category: 'gea_notifications'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    leadSubmissionEnabled: settings.lead_submission_notification_enabled || true,
    dealStageUpdateEnabled: settings.deal_stage_update_notification_enabled || true,
    commissionReleaseEnabled: settings.commission_release_notification_enabled || true,
    weeklyPerformanceSummaryEnabled: settings.weekly_performance_summary_enabled || true,
    emailEnabled: settings.notification_email_enabled || true,
    smsEnabled: settings.notification_sms_enabled || false,
    pushEnabled: settings.notification_push_enabled || true,
  };
}


export async function getPermissionConfig() {
  const config = await SystemSettings.find({
    category: 'gea_permissions'
  });

  const settings: Record<string, boolean> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    canAddLeads: settings.can_add_leads || true,
    canViewDeals: settings.can_view_deals || true,
    canEditDealInfo: settings.can_edit_deal_info || false,
    canAccessFinancialModeling: settings.can_access_financial_modeling || false,
    canChangePPAPricing: settings.can_change_ppa_pricing || false,
    canNegotiateTerms: settings.can_negotiate_terms || false,
    canAccessConfidentialDocs: settings.can_access_confidential_docs || false,
    canViewCommission: settings.can_view_commission || true,
    canRequestWithdrawal: settings.can_request_withdrawal || true,
    canAccessTrainingMaterial: settings.can_access_training_material || true,
  };
}


export async function getSystemConfig() {
  const config = await SystemSettings.find({
    category: 'gea_system'
  });

  const settings: Record<string, any> = {};
  config.forEach(item => {
    settings[item.key] = item.value;
  });

  return {
    referralCodeLength: settings.referral_code_length || 8,
    referralCodeExpiryDays: settings.referral_code_expiry_days || 365,
    dataRetentionDays: settings.data_retention_days || 1095,
    sessionTimeoutMinutes: settings.session_timeout_minutes || 480,
    maxLeadsPerDay: settings.max_leads_per_day || 50,
    apiRateLimitPerMinute: settings.api_rate_limit_per_minute || 100,
  };
}