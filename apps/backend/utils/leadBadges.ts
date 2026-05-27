import SystemSettings from '../models/SystemSettings';

const DEFAULT_HIGH_VALUE_THRESHOLD = 500000;
const DAY_MS = 24 * 60 * 60 * 1000;

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const hasAllValues = (values: unknown[]) => values.every(hasValue);

const isPerfectSubmission = (lead: any) => {
  if (!lead) return false;

  const baseFields = [
    lead.firstName,
    lead.lastName,
    lead.email,
    lead.mobile,
    lead.leadSource,
    lead.estimatedValue,
  ];

  const addressFields = [
    lead.address?.line1,
    lead.address?.city,
    lead.address?.state,
    lead.address?.pincode,
  ];

  if (!hasAllValues([...baseFields, ...addressFields])) return false;

  const requiresCompany =
    lead.leadType === 'ges' ||
    lead.leadType === 'energy_subscriber' ||
    lead.leadType === 'gea' ||
    Boolean(lead.companyDetails);

  if (requiresCompany) {
    const companyFields = [
      lead.companyDetails?.companyName,
      lead.companyDetails?.cin,
      lead.companyDetails?.gst,
      lead.companyDetails?.discomConsumerNumber,
      lead.companyDetails?.connectionType,
      lead.companyDetails?.industry,
      lead.companyDetails?.creditRating,
      lead.companyDetails?.companyScale,
      lead.companyDetails?.connectedLoad,
      lead.companyDetails?.monthlyConsumption,
      lead.companyDetails?.currentTariff,
    ];
    if (!hasAllValues(companyFields)) return false;

    const energyFields = [
      lead.energyDetails?.currentConsumption,
      lead.energyDetails?.currentTariff,
      lead.energyDetails?.connectionType,
    ];
    if (!hasAllValues(energyFields)) return false;
  }

  return true;
};

const isQualityConnector = (lead: any) => {
  if (!lead?.verifiedAt) return false;
  const verifiedAt = new Date(lead.verifiedAt).getTime();
  if (Number.isNaN(verifiedAt)) return false;

  const history = Array.isArray(lead.leadHistory) ? lead.leadHistory : [];
  const hasChangesBeforeVerification = history.some((entry: any) => {
    if (!entry?.changedAt) return false;
    const changedAt = new Date(entry.changedAt).getTime();
    return !Number.isNaN(changedAt) && changedAt < verifiedAt;
  });
  if (hasChangesBeforeVerification) return false;

  if (lead.updatedAt) {
    const updatedAt = new Date(lead.updatedAt).getTime();
    if (!Number.isNaN(updatedAt) && updatedAt > verifiedAt) return false;
  }

  return true;
};

const isFastMover = (deal: any, lead: any) => {
  if (!deal?.createdAt || !lead?.createdAt) return false;
  const dealCreated = new Date(deal.createdAt).getTime();
  const leadCreated = new Date(lead.createdAt).getTime();
  if (Number.isNaN(dealCreated) || Number.isNaN(leadCreated)) return false;
  return dealCreated - leadCreated <= 30 * DAY_MS;
};

export const getHighValueThreshold = async () => {
  const setting = await SystemSettings.findOne({
    category: 'gea_system',
    key: 'high_value_lead_threshold',
  });

  const value = Number(setting?.value);
  return Number.isFinite(value) ? value : DEFAULT_HIGH_VALUE_THRESHOLD;
};

export const computeLeadBadges = (lead: any, threshold: number) => {
  const badges: string[] = [];

  if (lead?.estimatedValue != null && Number(lead.estimatedValue) >= threshold) {
    badges.push('High Value Lead');
  }
  if (isPerfectSubmission(lead)) {
    badges.push('Perfect Submission');
  }
  if (isQualityConnector(lead)) {
    badges.push('Quality Connector');
  }

  return badges;
};

export const computeDealBadges = (deal: any, lead: any, threshold: number) => {
  const badges = computeLeadBadges(lead, threshold);
  if (isFastMover(deal, lead)) {
    badges.push('Fast Mover');
  }
  return badges;
};
