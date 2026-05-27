import { Request } from 'express';
import { Document, Types } from 'mongoose';
import type { TracedRequest } from './correlation.js';

// User related types
export interface IUser extends Document {
    _id: Types.ObjectId;
    email: string;
    mobile: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Types.ObjectId | IRole;
    profileImage?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    isMobileVerified: boolean;
    lastLogin?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    passwordResetToken?: string;
    passwordResetExpire?: Date;
    otp?: string;
    otpExpire?: Date;
    companyName?: string;
    googleId?: string;
    agentCode?: string;
    geaCode?: string;
    commissionTier: number;
    referralId?: string;
    kycStatus: 'pending' | 'approved' | 'rejected';
    mustChangePassword: boolean;
    isDeleted: boolean;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    fullName: string;
    isLocked: boolean;
    matchPassword(enteredPassword: string): Promise<boolean>;
    incLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
}

export interface IRole extends Document {
    _id: Types.ObjectId;
    name: 'Super Admin' | 'Admin' | 'Sales Admin' | 'Finance Admin' | 'Ops Admin' | 'Legal Admin' | 'Product Admin' | 'GEP' | 'GES' | 'GEA';
    description?: string;
    permissions: IPermission[];
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
// geaId
export interface IPermission {
    resource: string;
    actions: string[];
}

export interface ISession extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    accessToken: string;
    refreshToken: string;
    deviceInfo: {
        userAgent?: string;
        browser?: string;
        os?: string;
        device?: string;
    };
    ipAddress?: string;
    location?: {
        city?: string;
        country?: string;
    };
    isActive: boolean;
    lastActivity: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Extended Request with user and correlation
export interface AuthRequest extends TracedRequest {
    user?: IUser;
    session?: ISession;
}

// Response types
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: any[];
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

// ROI Calculation types
export interface ROICalculation {
    currentMonthlyBill: number;
    monthlyConsumption: number;
    estimatedSolarGeneration: number;
    estimatedMonthlySavings: number;
    estimatedAnnualSavings: number;
    systemCost: number;
    paybackPeriod: number | null;
    twentyFiveYearSavings: number;
    roi: number;
    recommendedCapacity: number;
    capacityUnit: string;
    estimatedPanels: number;
    estimatedArea: number;
    estimatedCost: number;
    assumptions?: any;
}

// Bill parsed data type - Complete MSEDC High Tension Bill Structure
export interface ParsedBillData {
    // Basic Bill Information
    BILL_OF_SUPPLY_FOR_THE_MONTH_OF?: string;
    circle?: string;
    division?: string;
    sub_division?: string;

    // Consumer Information
    Consumer_No?: string;
    Consumer_Name?: string;
    Address?: string;
    Village?: string;
    Pin_Code?: string;

    // Bill Dates
    BILL_DATE?: string;
    DUE_DATE?: string;

    // Technical Details
    Contract_Demand_KVA?: number;
    Urban_Rural?: string;
    Connected_Load_KW?: number;
    Express_Feeder?: string;
    Metering_Type?: string;
    GSTIN?: string;
    Meter_No?: string;
    Feeder_Voltage_KV?: number;
    CT_Ratio?: string;
    Sanctioned_Load_KW?: number;
    Connected_CT_Ratio?: string;
    PT_Ratio?: string;
    Connected_PT_Ratio?: string;
    Feeder_Name?: string;
    Substation_Name?: string;
    Scale_Sector?: string;
    Activity?: string;

    // Complex nested objects with 100% accuracy
    CURRENT_CONSUMPTION_DETAILS?: {
        KWH?: string;
        KVAH?: string;
        RKVAH_LAG?: string;
        RKVAH_LEAD?: string;
        KW_MD?: string;
        KVA_MD?: string;
        Total_Consumption?: number;
    };

    TOD_RECORDED_MD?: {
        A?: string;
        B?: string;
        C?: string;
        D?: string;
    };

    BILLING_DEMAND?: {
        Recorded_MD_except_A_Zone?: string;
        "75_percent_of_Highest_Demand_preceding_11months"?: string;
        "75_percent_of_CD"?: string;
        Billed_Demand_KVA?: string;
    };

    TOD_CONSUMPTION_BREAKUP_UNITS?: {
        A_ZONE?: { Units?: string; Percentage?: string };
        B_ZONE?: { Units?: string; Percentage?: string };
        C_ZONE?: { Units?: string; Percentage?: string };
        D_ZONE?: { Units?: string; Percentage?: string };
    };

    TOD_CHARGES?: {
        A_ZONE?: string;
        B_ZONE?: string;
        C_ZONE?: string;
        D_ZONE?: string;
        TOTAL_TOD_CHARGES?: string;
    };

    // Existing sections
    TOD_CONSUMPTION_BREAKUP?: any;
    BILL_BREAKDOWN?: any;
    TOTAL_BILL_AMOUNT_PAYABLE?: any;

    // Additional dynamic fields
    [key: string]: any;
}

// Email types
export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

// Device info type
export interface DeviceInfo {
    userAgent: string;
    browser: string;
    os: string;
    device: string;
}

// Logging types
export type {
    LogLevel,
    LogCategory,
    LogContext,
    LogEntry,
    LoggerConfig,
    SanitizedLogEntry,
    LoggerTransport,
    FileTransportConfig,
    DatabaseTransportConfig,
    ExternalTransportConfig,
    LogQuery,
    LogStats
} from './logger.js';

export type {
    CorrelationContext,
    TracedRequest,
    TraceSpan,
    Trace,
    CorrelationIdGenerator,
    Tracer,
    RequestContext
} from './correlation.js';

export interface IGEAWallet extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    balance: number;
    currency: string;
    isActive: boolean;
    status: 'active' | 'frozen' | 'locked';
    frozenBy?: Types.ObjectId;
    frozenAt?: Date;
    frozenReason?: string;
    totalEarned: number;
    totalWithdrawn: number;
    pendingWithdrawal: number;
    withdrawalHistory: {
        amount: number;
        status: 'pending' | 'approved' | 'rejected' | 'completed';
        requestedAt: Date;
        processedAt?: Date;
        processedBy?: Types.ObjectId;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ITransaction extends Document {
    _id: Types.ObjectId;
    wallet: Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    reference: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}

export interface IDealMilestone extends Document {
    _id: Types.ObjectId;
    deal: Types.ObjectId;
    milestone: string;
    status: 'pending' | 'achieved';
    commissionAmount: number;
    achievedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGEAPerformance extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    period: string;
    leadsSubmitted: number;
    dealsClosed: number;
    commissionEarned: number;
    conversionRate: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IKYCVerification extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    documentType: 'pan' | 'aadhar' | 'bank';
    documentNumber: string;
    fileUrl: string;
    status: 'in_review' | 'approved' | 'rejected';
    rejectionReason?: string;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGEANotification extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    type: 'lead_status' | 'commission' | 'payment';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}

export interface IDeal extends Document {
    _id: Types.ObjectId;
    dealId: string;
    leadId: Types.ObjectId;
    geaId: Types.ObjectId;
    gepId?: Types.ObjectId;
    gesId?: Types.ObjectId;
    assignedAdminId: Types.ObjectId;
    assignedSalesManagerId?: Types.ObjectId;
    dealType: 'OA' | 'GEOA' | 'VNM' | 'Captive' | 'PPA';
    state: string;
    capacityMW: number;
    stage: 'Lead Verified' | 'Assigned' | 'Pitch Completed' | 'PPA Drafting' | 'PPA Signed' | 'Project Execution' | 'COD' | 'First Invoice';
    stageHistory: {
        stage: string;
        timestamp: Date;
        updatedBy: Types.ObjectId;
    }[];
    delayFlag: boolean;
    delayReason?: string;
    slaDeadline?: Date;
    internalNotes: {
        note: string;
        createdBy: Types.ObjectId;
        createdAt: Date;
    }[];
    status: 'active' | 'on_hold' | 'completed' | 'cancelled';
    dealHistory?: {
        field: string;
        from?: string;
        to?: string;
        changedBy?: Types.ObjectId;
        changedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IPPA extends Document {
    _id: Types.ObjectId;
    ppaNumber: string;
    dealId: Types.ObjectId;
    gepId: Types.ObjectId;
    gesId: Types.ObjectId;
    tenure: number; // years
    pricePerUnit: number;
    capacityAllocated: number; // MW
    status: 'draft' | 'pending_review' | 'pending_signature' | 'signed' | 'active' | 'expired';
    documentUrl?: string;
    signedAt?: Date;
    effectiveDate?: Date;
    expiryDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICommissionRule extends Document {
    _id: Types.ObjectId;
    ruleName: string;
    ruleType: 'per_mw' | 'milestone_based' | 'one_time' | 'recurring';
    applicableTo: 'GES' | 'GEP' | 'both';
    state?: string; // null = all states
    commissionPerMW?: number;
    milestones?: {
        name: string;
        percentage: number;
        triggerEvent: string;
    }[];
    capLimit?: number;
    floorLimit?: number;
    isActive: boolean;
    createdBy: Types.ObjectId;
    effectiveFrom: Date;
    effectiveTo?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IApproval extends Document {
    _id: Types.ObjectId;
    approvalId: string;
    type: 'lead_verification' | 'ppa_draft' | 'commission_milestone' | 'wallet_withdrawal' | 'exception_handling';
    referenceId: Types.ObjectId;
    referenceModel: string;
    requestedBy: Types.ObjectId;
    assignedTo: Types.ObjectId;
    impact: {
        amount?: number;
        capacityMW?: number;
        riskLevel?: 'low' | 'medium' | 'high';
    };
    status: 'pending' | 'approved' | 'rejected' | 'escalated';
    slaDeadline: Date;
    remarks?: string;
    decidedBy?: Types.ObjectId;
    decidedAt?: Date;
    escalatedTo?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICompliance extends Document {
    _id: Types.ObjectId;
    entityType: 'GEP' | 'GES' | 'Deal';
    entityId: Types.ObjectId;
    checklist: {
        item: string;
        status: 'pending' | 'completed' | 'failed';
        dueDate?: Date;
        completedAt?: Date;
        documentUrl?: string;
    }[];
    riskLevel: 'green' | 'amber' | 'red';
    riskIndicators: string[];
    regulatoryApprovals: {
        type: string;
        status: string;
        approvalNumber?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ISystemConfiguration extends Document {
    _id: Types.ObjectId;
    key: string;
    value: any;
    description?: string;
    category: 'feature_toggle' | 'deal_type' | 'state_activation' | 'general';
    isActive: boolean;
    updatedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export type {
    PerformanceMetrics,
    MemoryUsage,
    CpuUsage,
    PerformanceThresholds,
    SlowQueryInfo,
    PerformanceAlert,
    PerformanceReport,
    PerformanceConfig,
    HealthStatus,
    HealthCheckResult
} from './perfrormance.js';
