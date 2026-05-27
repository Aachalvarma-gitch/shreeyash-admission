import axios, { AxiosResponse } from 'axios';
// @ts-ignore - form-data package has compatibility issues with ES modules
import FormData from 'form-data';
import fs from 'fs';
import Bill from '../models/Bill.model.js';
import SystemSettings from '../models/SystemSettings';
import { ParsedBillData } from '../types/index.js';
import { logger } from './logger.service.js';
import { logExternalCall } from '../utils/externalCallLogger.js';
import { electricityBillSchema } from '../utils/nanonest-schema.js';

// Removed NanonestOCRRequest interface - now using FormData as per API docs

interface NanonestOCRResponse {
    success?: boolean;
    data?: ParsedBillData;
    json?: any;
    confidence?: number;
    confidence_score?: number;
    error?: string;
    processing_time?: number;
    markdown?: string;
    html?: string;
    csv?: string;
}

/**
 * Check if Nanonest OCR is enabled
 */
const isNanonestEnabled = async (): Promise<boolean> => {
    try {
        const setting = await SystemSettings.findOne({
            category: 'ocr',
            key: 'ocr_service_provider',
        });
        return setting ? setting.value === 'nanonest' : false;
    } catch (error) {
        console.error('Error checking OCR provider settings:', error);
        return false;
    }
};

/**
 * Get Nanonest configuration settings
 */
const getNanonestSettings = async () => {
    try {
        const [timeout, confidenceThreshold] = await Promise.all([
            SystemSettings.findOne({ category: 'ocr', key: 'nanonest_timeout_seconds' }),
            SystemSettings.findOne({ category: 'ocr', key: 'ocr_confidence_threshold' })
        ]);

        // Get API key from environment variable
        const apiKey = process.env.NANONEST_API_KEY;
        if (!apiKey) {
            throw new Error('NANONEST_API_KEY environment variable not set');
        }

        // API endpoint - Using Nanonets extraction API
        // The extraction API doesn't require a model ID
        const apiEndpoint = process.env.NANONEST_API_ENDPOINT || 'https://extraction-api.nanonets.com/api/v1/extract/sync';

        return {
            apiKey,
            apiEndpoint,
            timeout: (timeout?.value || 60) * 1000, // Convert to milliseconds
            confidenceThreshold: confidenceThreshold?.value || 70
        };
    } catch (error) {
        console.error('Error getting Nanonest settings:', error);
        throw error;
    }
};

/**
 * Process electricity bill using Nanonest API
 */
export const processBillWithNanonest = async (
    billId: string,
    filePath: string,
    fileType: string,
    correlationId?: string,
    userId?: string
): Promise<{
    rawText: string;
    parsedData: ParsedBillData;
    confidence: number;
    requiresManualReview: boolean;
    ocrProvider: 'custom' | 'nanonest';
    processingTime: number;
    apiResponse: any;
}> => {
    const startTime = Date.now();

    try {
        logger.logBusinessStep('Nanonest OCR processing started', {
            correlationId,
            userId,
            billId,
            filePath,
            fileType
        });

        // Check if Nanonest is enabled
        const enabled = await isNanonestEnabled();
        if (!enabled) {
            throw new Error('Nanonest OCR is not enabled');
        }

        const settings = await getNanonestSettings();

        // Generate custom instructions for structured extraction
        const customInstructions = [
            'Extract all text and data from this electricity bill PDF.',
            'Return the extracted information as a structured JSON object.',
            'Extract consumer details, billing information, consumption data, and all numerical values.',
            'Format dates as DD/MM/YYYY and amounts as numbers without currency symbols.'
        ].join(' ');

        logger.logBusinessStep('Nanonest API call initiated', {
            correlationId,
            userId,
            billId,
            endpoint: settings.apiEndpoint,
            timeout: settings.timeout
        });

        // Read local file directly
        logger.logBusinessStep('Reading local file for Nanonest processing', {
            correlationId,
            userId,
            billId,
            filePath
        });

        let fileBuffer: Buffer;
        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`Local file not found: ${filePath}`);
            }

            fileBuffer = fs.readFileSync(filePath);

            logger.logBusinessStep('Local file read successfully', {
                correlationId,
                userId,
                billId,
                fileSize: fileBuffer.length,
                fileType: fileType
            });

            // Validate file size (should not be empty)
            if (fileBuffer.length === 0) {
                throw new Error('Local file is empty');
            }

        } catch (readError: any) {
            logger.logBusinessStep('Local file read failed', {
                correlationId,
                userId,
                billId,
                filePath,
                error: readError.message
            });
            throw new Error(`Failed to read local file: ${readError.message}`);
        }

        // Prepare FormData for Nanonets extraction API
        const formData = new FormData();
        const filename = `bill-${billId}.${fileType.split('/')[1] || 'pdf'}`;

        formData.append("file", fileBuffer, { filename });

        // 2️⃣ Other fields for extraction API
        formData.append("output_format", "json");

        formData.append(
            "json_options",
            JSON.stringify({
                type: "object",
                properties: {
                    "Bill_Month": {
                        "type": "string"
                    },
                    "Circle": {
                        "type": "string"
                    },
                    "Division": {
                        "type": "string"
                    },
                    "Sub_Division": {
                        "type": "string"
                    },
                    "Consumer_No": {
                        "type": "string"
                    },
                    "Consumer_Name": {
                        "type": "string"
                    },
                    "Address": {
                        "type": "string"
                    },
                    "Village": {
                        "type": "string"
                    },
                    "Pin_Code": {
                        "type": "string"
                    },
                    "Bill_Date": {
                        "type": "string"
                    },
                    "Due_Date": {
                        "type": "string"
                    },
                    "Amount": {
                        "type": "number"
                    },
                    "GSTIN": {
                        "type": "string"
                    },
                    "PAN": {
                        "type": "string"
                    },
                    "Metering_Type": {
                        "type": "string"
                    },
                    "Meter_No": {
                        "type": "string"
                    },
                    "Feeder_Voltage_KV": {
                        "type": "number"
                    },
                    "CT_Ratio": {
                        "type": "string"
                    },
                    "Connected_CT_Ratio": {
                        "type": "string"
                    },
                    "Connected_PT_Ratio": {
                        "type": "string"
                    },
                    "PT_Ratio": {
                        "type": "string"
                    },
                    "Feeder_Name": {
                        "type": "string"
                    },
                    "Substation_Name": {
                        "type": "string"
                    },
                    "Urban_Rural": {
                        "type": "string"
                    },
                    "Express_Feeder": {
                        "type": "string"
                    },
                    "Contract_Demand_KVA": {
                        "type": "number"
                    },
                    "Connected_Load_KW": {
                        "type": "number"
                    },
                    "Sanctioned_Load_KW": {
                        "type": "number"
                    },
                    "Scale_Sector": {
                        "type": "string"
                    },
                    "Activity": {
                        "type": "string"
                    },
                    "CURRENT_CONSUMPTION_DETAILS": {
                        "type": "object",
                        "properties": {
                            "Reading_Details": {
                                "type": "object",
                                "properties": {
                                    "KWH": {
                                        "type": "number"
                                    },
                                    "KVAH": {
                                        "type": "number"
                                    },
                                    "RKVAH_LAG": {
                                        "type": "number"
                                    },
                                    "RKVAH_LEAD": {
                                        "type": "number"
                                    },
                                    "KW_MD": {
                                        "type": "number"
                                    },
                                    "KVA_MD": {
                                        "type": "number"
                                    }
                                }
                            },
                            "Total_Consumption": {
                                "type": "number"
                            }
                        }
                    },
                    "TOD_Recorded_MD": {
                        "type": "object",
                        "properties": {
                            "A": {
                                "type": "number"
                            },
                            "B": {
                                "type": "number"
                            },
                            "C": {
                                "type": "number"
                            },
                            "D": {
                                "type": "number"
                            }
                        }
                    },
                    "Billing_Demand": {
                        "type": "object",
                        "properties": {
                            "Recorded_MD_except_A_Zone": {
                                "type": "number"
                            },
                            "SeventyFive_Percent_Highest_Demand_11Months": {
                                "type": "number"
                            },
                            "SeventyFive_Percent_of_CD": {
                                "type": "number"
                            },
                            "Billed_Demand_KVA": {
                                "type": "number"
                            }
                        }
                    },
                    "TOD_CONSUMPTION_BREAKUP_Units": {
                        "type": "object",
                        "properties": {
                            "A_ZONE": {
                                "type": "object",
                                "properties": {
                                    "Units": {
                                        "type": "number"
                                    },
                                    "Percentage": {
                                        "type": "string"
                                    }
                                }
                            },
                            "B_ZONE": {
                                "type": "object",
                                "properties": {
                                    "Units": {
                                        "type": "number"
                                    },
                                    "Percentage": {
                                        "type": "string"
                                    }
                                }
                            },
                            "C_ZONE": {
                                "type": "object",
                                "properties": {
                                    "Units": {
                                        "type": "number"
                                    },
                                    "Percentage": {
                                        "type": "string"
                                    }
                                }
                            },
                            "D_ZONE": {
                                "type": "object",
                                "properties": {
                                    "Units": {
                                        "type": "number"
                                    },
                                    "Percentage": {
                                        "type": "string"
                                    }
                                }
                            }
                        }
                    },
                    "TOD_CHARGES": {
                        "type": "object",
                        "properties": {
                            "A_ZONE": {
                                "type": "number"
                            },
                            "B_ZONE": {
                                "type": "number"
                            },
                            "C_ZONE": {
                                "type": "number"
                            },
                            "D_ZONE": {
                                "type": "number"
                            },
                            "TOTAL_TOD_CHARGES": {
                                "type": "number"
                            }
                        }
                    },
                    "DEBIT_DETAILS": {
                        "type": "object",
                        "properties": {
                            "Demand_Charges": {
                                "type": "number"
                            },
                            "Wheeling_Charges": {
                                "type": "number"
                            },
                            "Energy_Charges": {
                                "type": "number"
                            },
                            "FAC": {
                                "type": "number"
                            },
                            "Tax_on_Sale": {
                                "type": "number"
                            },
                            "CREDIT_DETAILS": {
                                "type": "object",
                                "properties": {
                                    "Incremental_Consumption_Rebate": {
                                        "type": "number"
                                    },
                                    "Prompt_Payment_Discount": {
                                        "type": "number"
                                    },
                                    "Region_Subsidy": {
                                        "type": "number"
                                    },
                                    "Bulk_Consumption_Rebate": {
                                        "type": "number"
                                    }
                                }
                            },
                            "TOTAL_CURRENT_BILL_AS_PER_TARIFF": {
                                "type": "number"
                            }
                        }
                    },
                    "Arrears": {
                        "type": "object",
                        "properties": {
                            "Principal_Arrears": {
                                "type": "number"
                            },
                            "Interest_Arrears": {
                                "type": "number"
                            }
                        }
                    },
                    "Total_Bill_Amount_Payable": {
                        "type": "object",
                        "properties": {
                            "Before_PPD": {
                                "type": "number"
                            },
                            "Amount_In_Words": {
                                "type": "string"
                            }
                        }
                    }
                }
            })
        );

        logger.logBusinessStep('FormData prepared for Nanonest extraction API', {
            correlationId,
            userId,
            billId,
            filename,
            contentType: fileType,
            fileSize: fileBuffer.length,
            endpoint: settings.apiEndpoint
        });

        // Make API call to Nanonest using FormData with external call logging
        const result = await logExternalCall(
            {
                service: 'nanonest',
                endpoint: settings.apiEndpoint,
                method: 'POST',
                correlationId,
                userId,
                timeout: settings.timeout,
                logRequestBody: false,
                logResponseBody: false
            },
            async () => {
                const response: AxiosResponse<NanonestOCRResponse> = await axios.post(
                    settings.apiEndpoint,
                    formData,
                    {
                        headers: {
                            'Authorization': `Bearer ${settings.apiKey}`,
                            // Let axios set Content-Type for FormData automatically
                            'X-Correlation-ID': correlationId || ''
                        },
                        timeout: settings.timeout
                    }
                );
                return (response as any).result?.data || (response as any).data || response;
            }
        );

        // Check if the external call was successful
        if (!result.success) {
            const errorMsg = result.error?.message || 'External call to Nanonest failed';

            // Log additional details if available
            if ((result.error as any)?.response?.data) {
                logger.logBusinessStep('Nanonest API error details', {
                    correlationId,
                    userId,
                    statusCode: (result.error as any).response.status,
                    statusText: (result.error as any).response.statusText,
                    errorData: (result.error as any).response.data,
                    headers: (result.error as any).response.headers
                });
            } else if ((result.error as any)?.response) {
                logger.logBusinessStep('Nanonest API error with response', {
                    correlationId,
                    userId,
                    statusCode: (result.error as any).response.status,
                    statusText: (result.error as any).response.statusText,
                    responseData: (result.error as any).response.data
                });
            } else {
                logger.logBusinessStep('Nanonest API error without response', {
                    correlationId,
                    userId,
                    error: result.error?.message,
                    errorCode: (result.error as any)?.code
                });
            }

            throw new Error(`Nanonest API call failed: ${errorMsg}`);
        }

        // result.data contains the API response data
        // Try to extract the JSON content from different possible structures
        const extractedData = result.data?.result?.json || result.data?.result || result.data;

        if (!extractedData) {
            console.error('Nanonest API response structure:', JSON.stringify(result.data, null, 2));
            throw new Error('No response received from Nanonest API');
        }

        // Validate that we got structured data
        if (!extractedData || typeof extractedData !== 'object') {
            const errorMsg = 'Nanonest extraction API returned invalid data format';
            logger.logBusinessStep('Nanonest extraction API processing failed', {
                correlationId,
                userId,
                billId,
                error: errorMsg,
                responseData: extractedData
            });
            throw new Error(errorMsg);
        }

        // Calculate confidence score (extraction API typically doesn't provide confidence)
        const confidence = 85; // Default confidence for extraction API
        const processingTime = Date.now() - startTime;
        const confidencePercentage = Math.round(confidence);

        logger.logBusinessStep('Nanonest extraction API processing completed', {
            correlationId,
            userId,
            billId,
            confidence: confidencePercentage,
            processingTime,
            extractedFields: Object.keys(extractedData).length
        });

        return {
            rawText: JSON.stringify(extractedData, null, 2),
            parsedData: extractedData as ParsedBillData,
            confidence: confidencePercentage,
            requiresManualReview: confidencePercentage < settings.confidenceThreshold,
            ocrProvider: 'nanonest',
            processingTime,
            apiResponse: extractedData
        };

    } catch (error: any) {
        const processingTime = Date.now() - startTime;

        logger.logBusinessStep('Nanonest OCR processing error', {
            correlationId,
            userId,
            error: error?.message || 'Unknown error',
            processingTime
        });

        if (error?.response) {
            // API error response
            const errorMsg = `Nanonest API error: ${error.response.data?.error || error.response.statusText || error.message}`;
            throw new Error(errorMsg);
        } else if (error?.code === 'ECONNABORTED') {
            // Timeout error
            throw new Error('Nanonest API request timed out');
        } else {
            // Other errors
            const errorMsg = error?.message || 'Unknown Nanonest service error';
            throw new Error(`Nanonest service error: ${errorMsg}`);
        }
    }
};


/**
 * Test Nanonest API connection
 */
export const testNanonestConnection = async (
    correlationId?: string,
    userId?: string
): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    details?: any;
}> => {
    try {
        logger.logBusinessStep('Nanonest connection test started', {
            correlationId,
            userId
        });

        const settings = await getNanonestSettings();
        const startTime = Date.now();

        // Test connection by making a minimal API call (without a real file)
        // We'll use a placeholder URL that will likely fail, but test connectivity
        const testFormData = new FormData();
        testFormData.append('file_url', 'https://example.com/test.pdf'); // Placeholder URL
        testFormData.append('output_format', 'json');
        testFormData.append('custom_instructions', 'Extract any visible text from the document.');

        try {
            const result = await logExternalCall(
                {
                    service: 'nanonest',
                    endpoint: settings.apiEndpoint,
                    method: 'POST',
                    correlationId,
                    userId,
                    timeout: 10000,
                    logRequestBody: false,
                    logResponseBody: false
                },
                async () => {
                    const response = await axios.post(settings.apiEndpoint, testFormData, {
                        headers: {
                            'Authorization': `Bearer ${settings.apiKey}`,
                            // Let axios set Content-Type for FormData
                            'X-Correlation-ID': correlationId || ''
                        },
                        timeout: 10000
                    });
                    return response;
                }
            );

            // Check if the external call was successful
            if (!result.success) {
                const errorMsg = result.error?.message || 'Connection test failed';
                throw new Error(`Nanonest connection test failed: ${errorMsg}`);
            }

            const latency = Date.now() - startTime;

            logger.logBusinessStep('Nanonest connection test successful', {
                correlationId,
                userId,
                latency,
                status: result.statusCode
            });

            return {
                success: true,
                message: 'Nanonest API connection successful',
                latency,
                details: {
                    status: result.statusCode,
                    endpoint: settings.apiEndpoint
                }
            };

        } catch (apiError: any) {
            // If the test file doesn't exist, that's expected - we just want to test connectivity
            if (apiError.response?.status === 400 && apiError.response?.data?.error?.includes('file')) {
                const latency = Date.now() - startTime;
                return {
                    success: true,
                    message: 'Nanonest API connection successful (file access expected to fail)',
                    latency,
                    details: {
                        status: apiError.response.status,
                        endpoint: settings.apiEndpoint,
                        note: 'Connection works, file access failed as expected'
                    }
                };
            }
            throw apiError;
        }

    } catch (error: any) {
        logger.logBusinessStep('Nanonest connection test failed', {
            correlationId,
            userId,
            error: error.message
        });

        return {
            success: false,
            message: `Nanonest API connection failed: ${error.message}`,
            details: {
                error: error.code || error.message
            }
        };
    }
};

/**
 * Get Nanonest usage statistics
 */
export const getNanonestUsageStats = async (
    correlationId?: string,
    userId?: string
): Promise<any> => {
    try {
        logger.logBusinessStep('Nanonest usage stats requested', {
            correlationId,
            userId
        });

        const settings = await getNanonestSettings();

        const usageEndpoint = settings.apiEndpoint.replace('/ocr', '/usage');

        const response = await axios.get(usageEndpoint, {
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'X-Correlation-ID': correlationId || ''
            },
            timeout: 10000
        });

        logger.logBusinessStep('Nanonest usage stats retrieved', {
            correlationId,
            userId
        });

        return response.data;
    } catch (error: any) {
        logger.logBusinessStep('Nanonest usage stats error', {
            correlationId,
            userId,
            error: error.message
        });

        console.error('Failed to get Nanonest usage stats:', error);
        return null;
    }
};
