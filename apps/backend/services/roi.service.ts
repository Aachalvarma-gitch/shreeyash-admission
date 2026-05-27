import SystemSettings from '../models/SystemSettings';
import { ROICalculation, ParsedBillData } from '../types/index.js';

interface ROISettings {
  solarPanelCostPerKW: number;
  installationCostPerKW: number;
  maintenanceCostPerYear: number;
  solarGenerationFactor: number;
  electricityRatePerUnit: number;
  systemLifespan: number;
  annualDegradation: number;
  governmentSubsidyPercentage: number;
  systemEfficiency: number;
}

/**
 * Get system settings for ROI calculation
 */
const getROISettings = async (): Promise<ROISettings> => {
  try {
    const settings = await SystemSettings.find({
      category: 'roi',
    });

    const roiSettings: any = {};
    settings.forEach(setting => {
      roiSettings[setting.key] = setting.value;
    });

    // Default values if settings not found
    return {
      solarPanelCostPerKW: roiSettings.solarPanelCostPerKW || 35000,
      installationCostPerKW: roiSettings.installationCostPerKW || 10000,
      maintenanceCostPerYear: roiSettings.maintenanceCostPerYear || 2000,
      solarGenerationFactor: roiSettings.solarGenerationFactor || 4.5, // kWh per kW per day
      electricityRatePerUnit: roiSettings.electricityRatePerUnit || 14.22,
      systemLifespan: roiSettings.systemLifespan || 25,
      annualDegradation: roiSettings.annualDegradation || 0.5, // 0.5% per year
      governmentSubsidyPercentage: roiSettings.governmentSubsidyPercentage || 20,
      systemEfficiency: roiSettings.systemEfficiency || 0.9,
    };
  } catch (error) {
    console.error('Error getting ROI settings:', error);
    // Return default values
    return {
      solarPanelCostPerKW: 35000,
      installationCostPerKW: 10000,
      maintenanceCostPerYear: 2000,
      solarGenerationFactor: 4.5,
      electricityRatePerUnit: 14.22,
      systemLifespan: 25,
      annualDegradation: 0.5,
      governmentSubsidyPercentage: 20,
      systemEfficiency: 0.9,
    };
  }
};

/**
 * Calculate recommended solar capacity based on consumption
 * Formula: Daily Consumption / (Peak Sun Hours × System Efficiency)
 * 
 * Example with 89,032 kWh/month:
 * - Daily consumption = 89,032 / 30 = 2,968 kWh/day
 * - Peak sun hours = 4.5 hours
 * - System efficiency = 0.7 (accounts for inverter losses, wiring, soiling, degradation)
 * - Recommended capacity = 2,968 / (4.5 × 0.7) = 942 kWp
 */
export const calculateRecommendedCapacity = (monthlyConsumption: number): number => {
  // Average daily consumption in kWh
  const dailyConsumption = monthlyConsumption / 30;

  // Peak sunlight hours per day (India average)
  const peakSunHours = 4.5;

  // System efficiency factor (accounts for all losses)
  // - Inverter efficiency: ~95%
  // - Wiring losses: ~2%
  // - Soiling/dust: ~3-5%
  // - Temperature derating: ~10-15%
  // - System availability: ~98%
  // Combined: ~70%
  const systemEfficiency = 0.70;

  // Required capacity in kWp
  // Formula: Daily consumption / (Peak hours × Efficiency)
  const recommendedCapacity = dailyConsumption / (peakSunHours * systemEfficiency);

  return Math.ceil(recommendedCapacity);
};

/**
 * Calculate solar system cost
 */
export const calculateSystemCost = async (capacityKW: number): Promise<{
  panelCost: number;
  installationCost: number;
  totalCost: number;
  subsidy: number;
  netCost: number;
}> => {
  const settings = await getROISettings();

  const panelCost = capacityKW * settings.solarPanelCostPerKW;
  const installationCost = capacityKW * settings.installationCostPerKW;
  const totalCost = panelCost + installationCost;

  // Apply subsidy if applicable
  const subsidy = totalCost * (settings.governmentSubsidyPercentage / 100);
  const netCost = totalCost - subsidy;

  return {
    panelCost,
    installationCost,
    totalCost,
    subsidy,
    netCost,
  };
};

/**
 * Calculate estimated solar generation
 */
export const calculateSolarGeneration = async (capacityKW: number): Promise<{
  dailyGeneration: number;
  monthlyGeneration: number;
  annualGeneration: number;
}> => {
  const settings = await getROISettings();

  // Daily generation in kWh
  const dailyGeneration = capacityKW * settings.solarGenerationFactor;

  // Monthly generation
  const monthlyGeneration = dailyGeneration * 30;

  // Annual generation
  const annualGeneration = dailyGeneration * 365;

  return {
    dailyGeneration: Math.round(dailyGeneration * 100) / 100,
    monthlyGeneration: Math.round(monthlyGeneration * 100) / 100,
    annualGeneration: Math.round(annualGeneration * 100) / 100,
  };
};

/**
 * Calculate savings
 */
export const calculateSavings = async (capacityKW: number, currentMonthlyBill: number): Promise<{
  monthlySavings: number;
  annualSavings: number;
}> => {
  const settings = await getROISettings();
  const generation = await calculateSolarGeneration(capacityKW);

  // Use configurable system efficiency for grid offset
  const effectiveGeneration = generation.monthlyGeneration * settings.systemEfficiency;

  // Monthly savings
  const monthlySavings = effectiveGeneration * settings.electricityRatePerUnit;

  // Annual savings
  const annualSavings = monthlySavings * 12;

  return {
    monthlySavings: Math.round(monthlySavings),
    annualSavings: Math.round(annualSavings),
  };
};

/**
 * Calculate payback period
 */
export const calculatePaybackPeriod = (systemCost: number, annualSavings: number, annualMaintenance: number): number | null => {
  const netAnnualSavings = annualSavings - annualMaintenance;

  if (netAnnualSavings <= 0) {
    return null; // Not viable
  }

  const paybackPeriod = systemCost / netAnnualSavings;

  return Math.round(paybackPeriod * 10) / 10; // Round to 1 decimal
};

/**
 * Calculate lifetime savings (25 years)
 */
export const calculateLifetimeSavings = async (annualSavings: number): Promise<number> => {
  const settings = await getROISettings();
  let totalSavings = 0;

  for (let year = 1; year <= settings.systemLifespan; year++) {
    // Account for system degradation
    const degradationFactor = 1 - ((year - 1) * settings.annualDegradation / 100);
    const yearSavings = annualSavings * degradationFactor;
    totalSavings += yearSavings;
  }

  return Math.round(totalSavings);
};

/**
 * Calculate ROI percentage
 */
export const calculateROI = (totalSavings: number, systemCost: number): number => {
  const roi = ((totalSavings - systemCost) / systemCost) * 100;
  return Math.round(roi * 10) / 10;
};

/**
 * Complete ROI calculation
 */
export const calculateCompleteROI = async (billData: any): Promise<ROICalculation> => {
  try {
    const settings = await getROISettings();

    // Extract consumption and bill amount
    const monthlyConsumption = billData.CURRENT_CONSUMPTION_DETAILS?.Total_Consumption ||
      billData.totalConsumption || 0;
    const currentMonthlyBill = billData.DEBIT_DETAILS?.TOTAL_CURRENT_BILL_AS_PER_TARIFF ||
      billData.BILL_BREAKDOWN?.TOTAL_CURRENT_BILL_AS_PER_TARIFF ||
      billData.Total_Bill_Amount_Payable_Rs?.Before_PPD ||
      billData.totalAmount || 0;

    // Calculate recommended capacity
    const recommendedCapacity = calculateRecommendedCapacity(monthlyConsumption);

    // Calculate system cost
    const systemCost = await calculateSystemCost(recommendedCapacity);

    // Calculate generation
    const generation = await calculateSolarGeneration(recommendedCapacity);

    // Calculate savings
    const savings = await calculateSavings(recommendedCapacity, currentMonthlyBill);

    // Calculate payback period
    const paybackPeriod = calculatePaybackPeriod(
      systemCost.netCost,
      savings.annualSavings,
      settings.maintenanceCostPerYear
    );

    // Calculate lifetime savings
    const lifetimeSavings = await calculateLifetimeSavings(savings.annualSavings);

    // Calculate ROI
    const roi = calculateROI(lifetimeSavings, systemCost.netCost);

    // Calculate number of panels (assuming 400W panels)
    const panelWattage = 400;
    const estimatedPanels = Math.ceil((recommendedCapacity * 1000) / panelWattage);

    // Calculate estimated area (assuming 2 sq meters per panel)
    const estimatedArea = estimatedPanels * 2;

    return {
      currentMonthlyBill,
      monthlyConsumption,
      estimatedSolarGeneration: generation.monthlyGeneration,
      estimatedMonthlySavings: savings.monthlySavings,
      estimatedAnnualSavings: savings.annualSavings,
      systemCost: systemCost.netCost,
      paybackPeriod: paybackPeriod || 0,
      twentyFiveYearSavings: lifetimeSavings,
      roi,
      recommendedCapacity,
      capacityUnit: 'kW',
      estimatedPanels,
      estimatedArea,
      estimatedCost: systemCost.netCost,
      assumptions: settings,
    };
  } catch (error) {
    console.error('ROI calculation error:', error);
    throw new Error('Failed to calculate ROI');
  }
};

