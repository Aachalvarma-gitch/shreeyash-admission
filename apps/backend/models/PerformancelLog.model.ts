import mongoose, { Schema, Document } from 'mongoose';
import { PerformanceMetrics, MemoryUsage, CpuUsage } from '../types/perfrormance.js';

export interface IPerformanceLog extends Document {
    _id: mongoose.Types.ObjectId;
    correlationId?: string;
    userId?: string;
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    memoryUsage: MemoryUsage;
    cpuUsage: CpuUsage;
    databaseQueryTime?: number;
    externalApiTime?: number;
    throughput?: number;
    errorRate?: number;
    timestamp: Date;
    expiresAt: Date; // TTL field
}

const PerformanceLogSchema = new Schema<IPerformanceLog>({
    correlationId: {
        type: String,
        index: true,
        sparse: true
    },
    userId: {
        type: String,
        index: true,
        sparse: true
    },
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        index: true
    },
    responseTime: {
        type: Number,
        required: true,
        index: true
    },
    statusCode: {
        type: Number,
        required: true,
        index: true
    },
    memoryUsage: {
        rss: { type: Number, required: true },
        heapTotal: { type: Number, required: true },
        heapUsed: { type: Number, required: true },
        external: { type: Number, required: true },
        arrayBuffers: { type: Number }
    },
    cpuUsage: {
        user: { type: Number, required: true },
        system: { type: Number, required: true },
        percentage: { type: Number }
    },
    databaseQueryTime: {
        type: Number,
        index: true
    },
    externalApiTime: {
        type: Number,
        index: true
    },
    throughput: {
        type: Number
    },
    errorRate: {
        type: Number
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'performancelogs'
});

// TTL index for automatic expiration (30 days for performance logs)
PerformanceLogSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: parseInt(process.env.PERFORMANCE_LOG_RETENTION_SECONDS || '2592000') // 30 days
});

// Performance analysis indexes
PerformanceLogSchema.index({ endpoint: 1, method: 1, responseTime: -1 });
PerformanceLogSchema.index({ responseTime: -1, createdAt: -1 });
PerformanceLogSchema.index({ statusCode: 1, createdAt: -1 });
PerformanceLogSchema.index({ correlationId: 1, createdAt: -1 });

// Memory and CPU monitoring indexes
PerformanceLogSchema.index({ 'memoryUsage.heapUsed': -1, createdAt: -1 });
PerformanceLogSchema.index({ 'cpuUsage.percentage': -1, createdAt: -1 });

// Static methods for performance analysis
PerformanceLogSchema.statics = {
    // Get average response times by endpoint
    async getAverageResponseTimes(startDate: Date, endDate: Date) {
        return this.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        endpoint: '$endpoint',
                        method: '$method'
                    },
                    avgResponseTime: { $avg: '$responseTime' },
                    minResponseTime: { $min: '$responseTime' },
                    maxResponseTime: { $max: '$responseTime' },
                    p95ResponseTime: {
                        $percentile: {
                            input: '$responseTime',
                            p: [0.95]
                        }
                    } as any,
                    totalRequests: { $sum: 1 },
                    errorCount: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { totalRequests: -1 }
            }
        ]);
    },

    // Find slowest endpoints
    async getSlowestEndpoints(limit = 10, hours = 24) {
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

        return this.aggregate([
            {
                $match: {
                    createdAt: { $gte: since }
                }
            },
            {
                $group: {
                    _id: {
                        endpoint: '$endpoint',
                        method: '$method'
                    },
                    avgResponseTime: { $avg: '$responseTime' },
                    maxResponseTime: { $max: '$responseTime' },
                    totalRequests: { $sum: 1 }
                }
            },
            {
                $sort: { avgResponseTime: -1 }
            },
            {
                $limit: limit
            }
        ]);
    },

    // Get memory usage trends
    async getMemoryUsageTrend(hours = 24) {
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

        return this.aggregate([
            {
                $match: {
                    createdAt: { $gte: since }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d %H:00:00',
                            date: '$createdAt'
                        }
                    },
                    avgHeapUsed: { $avg: '$memoryUsage.heapUsed' },
                    maxHeapUsed: { $max: '$memoryUsage.heapUsed' },
                    avgCpuPercentage: { $avg: '$cpuUsage.percentage' },
                    sampleCount: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);
    },

    // Get error rate trends
    async getErrorRateTrend(hours = 24) {
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

        return this.aggregate([
            {
                $match: {
                    createdAt: { $gte: since }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d %H:00:00',
                            date: '$createdAt'
                        }
                    },
                    totalRequests: { $sum: 1 },
                    errorRequests: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    errorRate: {
                        $multiply: [
                            { $divide: ['$errorRequests', '$totalRequests'] },
                            100
                        ]
                    }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);
    },

    // Find performance anomalies (response time > threshold)
    async findPerformanceAnomalies(thresholdMs = 5000, hours = 1) {
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

        return this.find({
            responseTime: { $gte: thresholdMs },
            createdAt: { $gte: since }
        })
            .sort({ responseTime: -1 })
            .limit(50);
    }
};

export const PerformanceLog = mongoose.model<IPerformanceLog>('PerformanceLog', PerformanceLogSchema);










































