/**
 * Lead Validation Engine
 * Handles category-based validation for different types of energy business leads
 */

import { BUSINESS_RULES, LeadCategory, getCategoryRules } from '../config/businessRules.js';
import { logger } from '../services/logger.service.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LeadValidationData {
  leadType: LeadCategory;
  energyDetails?: {
    estimatedCapacityMW?: number;
    landArea?: number;
    energyType?: string;
    locationType?: string;
    agentType?: 'individual' | 'company';
    experienceYears?: number;
    currentConsumption?: number;
    connectionType?: 'residential' | 'commercial' | 'industrial';
  };
  email?: string;
  mobile?: string;
  estimatedValue?: number;
}

export class LeadValidator {
  /**
   * Main validation method for lead creation/update
   */
  static validateLead(leadData: LeadValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic field validation
      this.validateBasicFields(leadData, errors);

      // Category-specific validation
      this.validateCategorySpecific(leadData, errors, warnings);

      // Business rule validation
      this.validateBusinessRules(leadData, errors, warnings);

      // Cross-field validation
      this.validateCrossFieldRules(leadData, errors, warnings);

    } catch (error) {
      logger.error('Lead validation error:', error);
      errors.push('Validation processing failed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate basic required fields
   */
  private static validateBasicFields(leadData: LeadValidationData, errors: string[]): void {
    // Email validation
    if (BUSINESS_RULES.validation.email.required) {
      if (!leadData.email) {
        errors.push('Email is required');
      } else if (!BUSINESS_RULES.validation.email.format.test(leadData.email)) {
        errors.push('Invalid email format');
      }
    }

    // Mobile validation
    if (BUSINESS_RULES.validation.mobile.required) {
      if (!leadData.mobile) {
        errors.push('Mobile number is required');
      } else if (!BUSINESS_RULES.validation.mobile.format.test(leadData.mobile)) {
        errors.push('Invalid mobile number format');
      } else if (leadData.mobile.length < BUSINESS_RULES.validation.mobile.minLength ||
                 leadData.mobile.length > BUSINESS_RULES.validation.mobile.maxLength) {
        errors.push(`Mobile number must be ${BUSINESS_RULES.validation.mobile.minLength} digits`);
      }
    }

    // Estimated value validation
    if (leadData.estimatedValue !== undefined) {
      if (leadData.estimatedValue < BUSINESS_RULES.validation.estimatedValue.min) {
        errors.push('Estimated value cannot be negative');
      } else if (leadData.estimatedValue > BUSINESS_RULES.validation.estimatedValue.max) {
        errors.push('Estimated value exceeds maximum allowed amount');
      }
    }
  }

  /**
   * Validate category-specific requirements
   */
  private static validateCategorySpecific(
    leadData: LeadValidationData,
    errors: string[],
    warnings: string[]
  ): void {
    const categoryRules = getCategoryRules(leadData.leadType);

    switch (leadData.leadType) {
      case 'solar_farm':
      case 'wind_farm':
      case 'hybrid_farm':
        this.validateEnergyGenerationLead(leadData, categoryRules, errors, warnings);
        break;

      case 'gea':
        this.validateSalesAgentLead(leadData, categoryRules, errors, warnings);
        break;

      case 'ges':
        this.validateEnergySubscriberLead(leadData, categoryRules, errors, warnings);
        break;
    }
  }

  /**
   * Validate energy generation leads (solar, wind, hybrid farms)
   */
  private static validateEnergyGenerationLead(
    leadData: LeadValidationData,
    rules: any,
    errors: string[],
    warnings: string[]
  ): void {
    const { energyDetails } = leadData;

    // Capacity validation
    if (rules.requiresCapacity) {
      if (!energyDetails?.estimatedCapacityMW && !energyDetails?.estimatedCapacityKW) {
        errors.push('Capacity estimation (MW or kW) is required for energy generation leads');
      } else {
        const capacityMW = energyDetails.estimatedCapacityMW ||
                          (energyDetails.estimatedCapacityKW ? energyDetails.estimatedCapacityKW / 1000 : 0);

        if (capacityMW < rules.minimumCapacityMW) {
          errors.push(`Minimum capacity is ${rules.minimumCapacityMW} MW`);
        } else if (capacityMW > rules.maximumCapacityMW) {
          warnings.push(`Capacity of ${capacityMW} MW exceeds typical range (${rules.maximumCapacityMW} MW max)`);
        }
      }
    }

    // Land area validation
    if (rules.requiresLandArea) {
      if (!energyDetails?.landArea || energyDetails.landArea <= 0) {
        errors.push('Land area is required for energy generation leads');
      } else if (energyDetails.landArea < rules.minimumLandArea) {
        warnings.push(`Land area of ${energyDetails.landArea} acres is below recommended minimum`);
      }
    }

    // Energy type validation
    if (energyDetails?.energyType && !['solar', 'wind', 'hybrid'].includes(energyDetails.energyType)) {
      errors.push('Invalid energy type. Must be solar, wind, or hybrid');
    }

    // Location type validation
    if (energyDetails?.locationType &&
        !['ground_mounted', 'rooftop', 'offshore'].includes(energyDetails.locationType)) {
      errors.push('Invalid location type');
    }
  }

  /**
   * Validate sales agent leads
   */
  private static validateSalesAgentLead(
    leadData: LeadValidationData,
    rules: any,
    errors: string[],
    warnings: string[]
  ): void {
    const { energyDetails } = leadData;

    // Agent type validation
    if (rules.requiresAgentType) {
      if (!energyDetails?.agentType) {
        errors.push('Agent type (individual or company) is required');
      } else if (!['individual', 'company'].includes(energyDetails.agentType)) {
        errors.push('Agent type must be individual or company');
      }
    }

    // Experience validation
    if (energyDetails?.experienceYears !== undefined) {
      if (energyDetails.experienceYears < rules.minimumExperienceYears) {
        errors.push('Experience years cannot be negative');
      } else if (energyDetails.experienceYears > rules.maximumExperienceYears) {
        warnings.push('Experience years seems unusually high');
      }
    }
  }

  /**
   * Validate energy subscriber leads
   */
  private static validateEnergySubscriberLead(
    leadData: LeadValidationData,
    rules: any,
    errors: string[],
    warnings: string[]
  ): void {
    const { energyDetails } = leadData;

    // Consumption validation
    if (rules.requiresConsumption) {
      if (!energyDetails?.currentConsumption || energyDetails.currentConsumption <= 0) {
        errors.push('Current consumption is required for subscriber leads');
      } else if (energyDetails.currentConsumption < rules.minimumConsumption) {
        warnings.push(`Consumption of ${energyDetails.currentConsumption} kWh/month is below minimum threshold`);
      } else if (energyDetails.currentConsumption > rules.maximumConsumption) {
        warnings.push(`Consumption of ${energyDetails.currentConsumption} kWh/month exceeds typical range`);
      }
    }

    // Connection type validation
    if (rules.requiresConnectionType) {
      if (!energyDetails?.connectionType) {
        errors.push('Connection type is required for subscriber leads');
      } else if (!['residential', 'commercial', 'industrial'].includes(energyDetails.connectionType)) {
        errors.push('Invalid connection type');
      }
    }
  }

  /**
   * Validate business rules and constraints
   */
  private static validateBusinessRules(
    leadData: LeadValidationData,
    errors: string[],
    warnings: string[]
  ): void {
    // Add any additional business rule validations here
    // For example: geographic restrictions, seasonal validations, etc.
  }

  /**
   * Validate cross-field relationships and business logic
   */
  private static validateCrossFieldRules(
    leadData: LeadValidationData,
    errors: string[],
    warnings: string[]
  ): void {
    const { energyDetails } = leadData;

    // Capacity to land area ratio validation
    if (energyDetails?.estimatedCapacityMW && energyDetails?.landArea) {
      const capacityPerAcre = energyDetails.estimatedCapacityMW / energyDetails.landArea;

      if (energyDetails.energyType === 'solar' && capacityPerAcre > 5) {
        warnings.push('Solar capacity per acre seems high (>5 MW/acre)');
      } else if (energyDetails.energyType === 'wind' && capacityPerAcre > 10) {
        warnings.push('Wind capacity per acre seems high (>10 MW/acre)');
      }
    }

    // Consumption to connection type validation
    if (energyDetails?.currentConsumption && energyDetails?.connectionType) {
      const consumption = energyDetails.currentConsumption;

      if (energyDetails.connectionType === 'residential' && consumption > 50000) {
        warnings.push('High consumption for residential connection type');
      } else if (energyDetails.connectionType === 'commercial' && consumption < 1000) {
        warnings.push('Low consumption for commercial connection type');
      }
    }
  }

  /**
   * Quick validation for specific fields
   */
  static validateField(fieldName: string, value: any, leadType?: LeadCategory): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (fieldName) {
      case 'email':
        if (!value) {
          errors.push('Email is required');
        } else if (!BUSINESS_RULES.validation.email.format.test(value)) {
          errors.push('Invalid email format');
        }
        break;

      case 'mobile':
        if (!value) {
          errors.push('Mobile number is required');
        } else if (!BUSINESS_RULES.validation.mobile.format.test(value)) {
          errors.push('Invalid mobile number format');
        }
        break;

      case 'estimatedCapacityMW':
        if (leadType && ['solar_farm', 'wind_farm', 'hybrid_farm'].includes(leadType)) {
          const rules = getCategoryRules(leadType);
          if (value < rules.minimumCapacityMW) {
            errors.push(`Minimum capacity is ${rules.minimumCapacityMW} MW`);
          }
        }
        break;

      // Add more field-specific validations as needed
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
