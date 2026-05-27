import asyncHandler from 'express-async-handler';
import AuditLog from '../models/AuditLog.model.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { StepLogger } from '../utils/stepLogger.js';
export const getAuditLogs = asyncHandler(async (req, res) => {
    const correlationId = req.correlationId;
    const stepLogger = new StepLogger('get-audit-logs', correlationId, req.user?._id?.toString());
    try {
        stepLogger.step('pagination-setup', {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            userId: req.query.userId,
            action: req.query.action,
            resource: req.query.resource,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        });
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { userId, action, resource, status, startDate, endDate } = req.query;
        const query = {};
        if (userId) {
            query.userId = userId;
            stepLogger.step('user-filter-applied', { userId });
        }
        if (action) {
            query.action = action;
            stepLogger.step('action-filter-applied', { action });
        }
        if (resource) {
            query.resource = resource;
            stepLogger.step('resource-filter-applied', { resource });
        }
        if (status) {
            query.status = status;
            stepLogger.step('status-filter-applied', { status });
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
            stepLogger.step('date-range-filter-applied', {
                startDate: startDate,
                endDate: endDate
            });
        }
        stepLogger.step('query-building-completed', {
            finalQuery: JSON.stringify(query),
            pagination: { page, limit, skip }
        });
        stepLogger.step('audit-logs-fetch-started');
        const logs = await AuditLog.find(query)
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        stepLogger.step('audit-logs-fetch-completed', { logCount: logs.length });
        stepLogger.step('count-fetch-started');
        const total = await AuditLog.countDocuments(query);
        stepLogger.step('count-fetch-completed', { totalCount: total });
        stepLogger.complete({
            auditLogsRetrieved: logs.length,
            totalAuditLogs: total,
            pagination: { page, limit, totalPages: Math.ceil(total / limit) },
            filtersApplied: {
                userId: !!userId,
                action: !!action,
                resource: !!resource,
                status: !!status,
                dateRange: !!(startDate || endDate)
            }
        });
        paginatedResponse(res, logs, page, limit, total, 'Audit logs retrieved successfully');
    }
    catch (error) {
        stepLogger.fail(error, {
            operation: 'get-audit-logs',
            errorType: error.name,
            errorMessage: error.message
        });
        throw error;
    }
});
export const getAuditLogById = asyncHandler(async (req, res) => {
    const correlationId = req.correlationId;
    const stepLogger = new StepLogger('get-audit-log-by-id', correlationId, req.user?._id?.toString());
    try {
        stepLogger.step('audit-log-lookup-started', { logId: req.params.id });
        const log = await AuditLog.findById(req.params.id)
            .populate('userId', 'firstName lastName email');
        stepLogger.step('audit-log-lookup-completed', {
            logFound: !!log,
            logId: log ? log._id.toString() : null,
            userId: log ? log.userId?._id?.toString() : null,
            action: log ? log.action : null,
            resource: log ? log.resource : null
        });
        if (!log) {
            stepLogger.fail(new Error('Audit log not found'), { reason: 'audit_log_not_found', logId: req.params.id });
            errorResponse(res, 'Audit log not found', 404);
            return;
        }
        stepLogger.complete({
            logId: log._id.toString(),
            action: log.action,
            resource: log.resource,
            status: log.status,
            auditLogRetrieved: true
        });
        successResponse(res, { log }, 'Audit log retrieved successfully');
    }
    catch (error) {
        stepLogger.fail(error, {
            operation: 'get-audit-log-by-id',
            errorType: error.name,
            errorMessage: error.message,
            logId: req.params.id
        });
        throw error;
    }
});
export const getUserAuditLogs = asyncHandler(async (req, res) => {
    const correlationId = req.correlationId;
    const stepLogger = new StepLogger('get-user-audit-logs', correlationId, req.user?._id?.toString());
    try {
        stepLogger.step('pagination-setup', {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            targetUserId: req.params.userId
        });
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { userId } = req.params;
        stepLogger.step('user-audit-logs-query-setup', {
            userId,
            pagination: { page, limit, skip }
        });
        stepLogger.step('user-audit-logs-fetch-started');
        const logs = await AuditLog.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        stepLogger.step('user-audit-logs-fetch-completed', { logCount: logs.length });
        stepLogger.step('count-fetch-started');
        const total = await AuditLog.countDocuments({ userId });
        stepLogger.step('count-fetch-completed', { totalCount: total });
        stepLogger.complete({
            targetUserId: userId,
            userAuditLogsRetrieved: logs.length,
            totalUserAuditLogs: total,
            pagination: { page, limit, totalPages: Math.ceil(total / limit) }
        });
        paginatedResponse(res, logs, page, limit, total, 'User audit logs retrieved successfully');
    }
    catch (error) {
        stepLogger.fail(error, {
            operation: 'get-user-audit-logs',
            errorType: error.name,
            errorMessage: error.message,
            targetUserId: req.params.userId
        });
        throw error;
    }
});
export const getAuditStats = asyncHandler(async (req, res) => {
    const correlationId = req.correlationId;
    const stepLogger = new StepLogger('get-audit-stats', correlationId, req.user?._id?.toString());
    try {
        stepLogger.step('audit-stats-calculation-started');
        stepLogger.step('basic-counts-started');
        const totalLogs = await AuditLog.countDocuments();
        const successfulActions = await AuditLog.countDocuments({ status: 'success' });
        const failedActions = await AuditLog.countDocuments({ status: 'failure' });
        stepLogger.step('basic-counts-completed', {
            totalLogs,
            successfulActions,
            failedActions
        });
        stepLogger.step('top-actions-aggregation-started');
        const topActions = await AuditLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        stepLogger.step('top-actions-aggregation-completed', { topActionsCount: topActions.length });
        stepLogger.step('top-resources-aggregation-started');
        const topResources = await AuditLog.aggregate([
            { $group: { _id: '$resource', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        stepLogger.step('top-resources-aggregation-completed', { topResourcesCount: topResources.length });
        stepLogger.step('most-active-users-aggregation-started');
        const mostActiveUsers = await AuditLog.aggregate([
            { $group: { _id: '$userId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    'user.firstName': 1,
                    'user.lastName': 1,
                    'user.email': 1,
                },
            },
        ]);
        stepLogger.step('most-active-users-aggregation-completed', {
            mostActiveUsersCount: mostActiveUsers.length,
            totalUserActivity: mostActiveUsers.reduce((sum, user) => sum + user.count, 0)
        });
        const statsData = {
            totalLogs,
            successfulActions,
            failedActions,
            topActions,
            topResources,
            mostActiveUsers,
        };
        stepLogger.step('audit-stats-compilation-completed', {
            totalLogs,
            successfulActions,
            failedActions,
            topActionsAnalyzed: topActions.length,
            topResourcesAnalyzed: topResources.length,
            activeUsersAnalyzed: mostActiveUsers.length
        });
        stepLogger.complete({
            auditStatsGenerated: true,
            totalAuditLogs: totalLogs,
            successRate: totalLogs > 0 ? (successfulActions / totalLogs) * 100 : 0,
            failureRate: totalLogs > 0 ? (failedActions / totalLogs) * 100 : 0,
            topEntitiesAnalyzed: {
                actions: topActions.length,
                resources: topResources.length,
                users: mostActiveUsers.length
            }
        });
        successResponse(res, statsData, 'Audit statistics retrieved successfully');
    }
    catch (error) {
        stepLogger.fail(error, {
            operation: 'get-audit-stats',
            errorType: error.name,
            errorMessage: error.message
        });
        throw error;
    }
});
export const exportAuditLogs = asyncHandler(async (req, res) => {
    const correlationId = req.correlationId;
    const stepLogger = new StepLogger('export-audit-logs', correlationId, req.user?._id?.toString());
    try {
        stepLogger.step('export-setup', {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            userId: req.query.userId,
            action: req.query.action,
            resource: req.query.resource
        });
        const { startDate, endDate, userId, action, resource } = req.query;
        const query = {};
        if (userId) {
            query.userId = userId;
            stepLogger.step('export-user-filter-applied', { userId });
        }
        if (action) {
            query.action = action;
            stepLogger.step('export-action-filter-applied', { action });
        }
        if (resource) {
            query.resource = resource;
            stepLogger.step('export-resource-filter-applied', { resource });
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
            stepLogger.step('export-date-range-applied', {
                startDate: startDate,
                endDate: endDate
            });
        }
        stepLogger.step('export-query-finalized', {
            finalQuery: JSON.stringify(query)
        });
        stepLogger.step('export-logs-fetch-started');
        const logs = await AuditLog.find(query)
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .lean();
        stepLogger.step('export-logs-fetch-completed', { exportLogCount: logs.length });
        stepLogger.step('export-data-formatting-started');
        const exportData = logs.map(log => ({
            timestamp: log.createdAt,
            user: log.userId?.email || 'Unknown',
            action: log.action,
            resource: log.resource,
            status: log.status,
            ipAddress: log.ipAddress,
        }));
        stepLogger.step('export-data-formatting-completed', {
            formattedRecords: exportData.length,
            exportFormat: 'structured_array'
        });
        stepLogger.complete({
            auditLogsExported: exportData.length,
            exportFiltersApplied: {
                userId: !!userId,
                action: !!action,
                resource: !!resource,
                dateRange: !!(startDate || endDate)
            },
            exportFormat: 'json_array',
            exportTimestamp: new Date().toISOString()
        });
        successResponse(res, { logs: exportData }, 'Audit logs exported successfully');
    }
    catch (error) {
        stepLogger.fail(error, {
            operation: 'export-audit-logs',
            errorType: error.name,
            errorMessage: error.message
        });
        throw error;
    }
});
//# sourceMappingURL=audit.controller.js.map