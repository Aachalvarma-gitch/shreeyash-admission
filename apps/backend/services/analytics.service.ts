import Analytics from '../models/Analytics.model.js';
import Bill from '../models/Bill.model.js';
import { calculateCompleteROI } from './roi.service.js';
import { Types } from 'mongoose';

/**
 * Generate analytics from bill data
 */
export const generateAnalytics = async (subscriberId: Types.ObjectId | string, billId: Types.ObjectId | string) => {
  try {
    // Get bill data
    const bill = await Bill.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    const parsedData = bill.parsedData || {};

    // Calculate ROI
    const roiCalculation = await calculateCompleteROI(parsedData);

    // Extract TOD consumption breakdown
    const todBreakdown = parsedData.TOD_CONSUMPTION_BREAKUP || {};

    // Create analytics data
    const analyticsData: any = {
      subscriberId,
      billId,
      period: {
        month: bill.billMonth,
        year: bill.billYear,
      },
      consumption: {
        total: parsedData.CURRENT_CONSUMPTION_DETAILS?.Total_Consumption || bill.totalConsumption,
        todBreakdown: {
          zoneA: {
            units: parseFloat(todBreakdown.A_ZONE?.Units) || 0,
            percentage: parseFloat(todBreakdown.A_ZONE?.Percentage) || 0,
          },
          zoneB: {
            units: parseFloat(todBreakdown.B_ZONE?.Units) || 0,
            percentage: parseFloat(todBreakdown.B_ZONE?.Percentage) || 0,
          },
          zoneC: {
            units: parseFloat(todBreakdown.C_ZONE?.Units) || 0,
            percentage: parseFloat(todBreakdown.C_ZONE?.Percentage) || 0,
          },
          zoneD: {
            units: parseFloat(todBreakdown.D_ZONE?.Units) || 0,
            percentage: parseFloat(todBreakdown.D_ZONE?.Percentage) || 0,
          },
        },
      },
      demand: {
        recorded: parsedData.CURRENT_CONSUMPTION_DETAILS?.KVA_MD,
        billed: parsedData.BILLING_DEMAND?.Billed_Demand_KVA || parsedData.Billing_Demand_Detailed?.Billed_Demand_KVA_Max_of_above,
        contractDemand: parsedData.Contract_Demand_KVA,
      },
      charges: {
        demandCharges: parsedData.BILL_BREAKDOWN?.Demand_Charges_Rs_600_per_KVA || bill.demandCharges,
        energyCharges: parsedData.BILL_BREAKDOWN?.Energy_Charges || bill.energyCharges,
        wheelingCharges: parsedData.BILL_BREAKDOWN?.Wheeling_Charge_Rs_0_74_per_Unit,
        todCharges: parsedData.BILL_BREAKDOWN?.TOD_Tariff_EC,
        fuelAdjustmentCharges: parsedData.BILL_BREAKDOWN?.FAC_Rs_0_30_per_Unit,
        electricityDuty: parsedData.BILL_BREAKDOWN?.Electricity_Duty,
        tax: parsedData.BILL_BREAKDOWN?.Tax_on_Sale_Rs_0_1904_per_Unit,
        total: parsedData.BILL_BREAKDOWN?.TOTAL_CURRENT_BILL_AS_PER_TARIFF || bill.totalAmount,
      },
      roiCalculation,
      solarRecommendation: {
        recommendedCapacity: roiCalculation.recommendedCapacity,
        capacityUnit: roiCalculation.capacityUnit,
        estimatedPanels: roiCalculation.estimatedPanels,
        estimatedArea: roiCalculation.estimatedArea,
        estimatedCost: roiCalculation.estimatedCost,
      },
      insights: [{ type: 'test', message: 'Test message', severity: 'info' as const }],
    };

    // Get previous month's analytics for comparison
    const previousAnalytics = await Analytics.findOne({
      subscriberId,
      'period.year': bill.billYear,
      'period.month': { $ne: bill.billMonth },
    }).sort({ createdAt: -1 });

    if (previousAnalytics && previousAnalytics.consumption.total && previousAnalytics.charges.total) {
      analyticsData.comparisonWithPreviousMonth = {
        consumptionChange: (analyticsData.consumption.total || 0) - previousAnalytics.consumption.total,
        consumptionChangePercentage: 
          (((analyticsData.consumption.total || 0) - previousAnalytics.consumption.total) / 
          previousAnalytics.consumption.total) * 100,
        costChange: (analyticsData.charges.total || 0) - previousAnalytics.charges.total,
        costChangePercentage: 
          (((analyticsData.charges.total || 0) - previousAnalytics.charges.total) / 
          previousAnalytics.charges.total) * 100,
      };
    }


    // Create or update analytics
    const analytics = await Analytics.findOneAndUpdate(
      {
        subscriberId,
        'period.month': bill.billMonth,
        'period.year': bill.billYear,
      },
      analyticsData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return analytics;
  } catch (error) {
    console.error('Analytics generation error:', error);
    throw new Error('Failed to generate analytics');
  }
};

/**
 * Generate insights based on bill data and ROI calculation
 */
const generateInsights = (billData: any, roiCalculation: any): Array<{ type: string; message: string; severity: 'info' | 'warning' | 'critical' }> => {
  const insights: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'critical' }> = [];

  // High consumption insight
  const consumption = billData.CURRENT_CONSUMPTION_DETAILS?.Total_Consumption || 0;
  if (consumption > 100000) {
    insights.push({
      type: 'high_consumption',
      message: `Your consumption of ${consumption} units is significantly high. Solar energy could dramatically reduce your electricity costs.`,
      severity: 'warning',
    });
  }

  // ROI insight
  if (roiCalculation.paybackPeriod && roiCalculation.paybackPeriod < 7) {
    insights.push({
      type: 'good_roi',
      message: `Excellent ROI! Your solar system will pay for itself in just ${roiCalculation.paybackPeriod} years.`,
      severity: 'info',
    });
  }

  // Savings insight
  if (roiCalculation.estimatedAnnualSavings > 500000) {
    insights.push({
      type: 'high_savings',
      message: `You could save over ₹${Math.round(roiCalculation.estimatedAnnualSavings / 100000)} lakhs annually with solar energy!`,
      severity: 'info',
    });
  }

  // Demand charges insight
  const demandCharges = billData.BILL_BREAKDOWN?.Demand_Charges_Rs_600_per_KVA || 0;
  const totalBill = billData.BILL_BREAKDOWN?.TOTAL_CURRENT_BILL_AS_PER_TARIFF || 1;
  const demandChargePercentage = (demandCharges / totalBill) * 100;

  if (demandChargePercentage > 30) {
    insights.push({
      type: 'high_demand_charges',
      message: `Demand charges account for ${Math.round(demandChargePercentage)}% of your bill. Consider optimizing your peak demand usage.`,
      severity: 'warning',
    });
  }

  // TOD insight
  const todBreakdown = billData.TOD_CONSUMPTION_BREAKUP || {};
  const zoneCPercentage = parseFloat(todBreakdown.C_ZONE?.Percentage) || 0;

  if (zoneCPercentage > 60) {
    insights.push({
      type: 'peak_usage',
      message: `${zoneCPercentage}% of your consumption is during peak hours (Zone C). Solar generation aligns perfectly with these hours!`,
      severity: 'info',
    });
  }

  // Contract demand insight
  const recordedDemand = billData.Billing_Demand_Detailed?.Recorded_MD_except_A_Zone || 0;
  const contractDemand = billData.Contract_Demand_KVA || 1;
  const demandUtilization = (recordedDemand / contractDemand) * 100;

  if (demandUtilization < 75) {
    insights.push({
      type: 'contract_demand_optimization',
      message: String(billData.Billing_Demand_Detailed?.Note || 'Review your Contract Demand to save on fixed charges.'),
      severity: 'info',
    });
  }

  return insights;
};

/**
 * Get subscriber analytics summary
 */
export const getSubscriberAnalyticsSummary = async (subscriberId: Types.ObjectId | string) => {
  try {
    const analytics = await Analytics.find({
      subscriberId,
      isDeleted: false,
    })
      .sort({ 'period.year': -1, 'period.month': -1 })
      .limit(12);

    if (analytics.length === 0) {
      return null;
    }

    // Calculate averages
    const totalConsumption = analytics.reduce((sum, a) => sum + (a.consumption.total || 0), 0);
    const totalCost = analytics.reduce((sum, a) => sum + (a.charges.total || 0), 0);
    const avgMonthlyConsumption = totalConsumption / analytics.length;
    const avgMonthlyCost = totalCost / analytics.length;

    // Get latest ROI calculation
    const latestROI = analytics[0]?.roiCalculation;

    return {
      totalBillsAnalyzed: analytics.length,
      avgMonthlyConsumption: Math.round(avgMonthlyConsumption),
      avgMonthlyCost: Math.round(avgMonthlyCost),
      totalAnnualConsumption: Math.round(totalConsumption),
      totalAnnualCost: Math.round(totalCost),
      latestROI,
      monthlyTrend: analytics.map(a => ({
        month: a.period.month,
        year: a.period.year,
        consumption: a.consumption.total,
        cost: a.charges.total,
      })),
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    throw new Error('Failed to get analytics summary');
  }
};

