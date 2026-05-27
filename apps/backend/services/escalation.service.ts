import Ticket from '../models/Ticket.model.js';
import User from '../models/User.model.js';
import { logger } from './logger.service.js';
import { calculateSLAStatus, getSLAPolicy } from './sla.service.js';
import { notifyTicketEscalated, notifySLAWarning, notifySLABreached } from './notification.service.js';

export interface EscalationLevel {
  level: number;
  role: string;
  action: string;
  hoursAfterBreach: number;
}

export interface EscalationRule {
  priority: string;
  levels: EscalationLevel[];
}

// Escalation rules configuration
export const ESCALATION_RULES: EscalationRule[] = [
  {
    priority: 'urgent',
    levels: [
      { level: 1, role: 'Ops Admin', action: 'assign', hoursAfterBreach: 1 },
      { level: 2, role: 'Admin', action: 'notify', hoursAfterBreach: 2 },
      { level: 3, role: 'Super Admin', action: 'notify', hoursAfterBreach: 4 },
    ],
  },
  {
    priority: 'high',
    levels: [
      { level: 1, role: 'Ops Admin', action: 'assign', hoursAfterBreach: 4 },
      { level: 2, role: 'Admin', action: 'notify', hoursAfterBreach: 8 },
      { level: 3, role: 'Super Admin', action: 'notify', hoursAfterBreach: 24 },
    ],
  },
  {
    priority: 'medium',
    levels: [
      { level: 1, role: 'Ops Admin', action: 'assign', hoursAfterBreach: 8 },
      { level: 2, role: 'Admin', action: 'notify', hoursAfterBreach: 24 },
      { level: 3, role: 'Super Admin', action: 'notify', hoursAfterBreach: 72 },
    ],
  },
  {
    priority: 'low',
    levels: [
      { level: 1, role: 'Admin', action: 'assign', hoursAfterBreach: 24 },
      { level: 2, role: 'Super Admin', action: 'notify', hoursAfterBreach: 72 },
    ],
  },
];

/**
 * Get escalation rule for a priority
 */
export const getEscalationRule = (priority: string): EscalationRule | null => {
  return ESCALATION_RULES.find(r => r.priority === priority) || null;
};

/**
 * Check if a ticket needs escalation
 */
export const checkEscalation = async (
  ticketId: string
): Promise<{
  needsEscalation: boolean;
  currentLevel?: number;
  suggestedAction?: string;
  reason?: string;
}> => {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { needsEscalation: false, reason: 'Ticket not found' };
    }

    // Skip if already resolved or closed
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return { needsEscalation: false, reason: 'Ticket is resolved/closed' };
    }

    // Skip if no SLA breach
    const slaStatus = await calculateSLAStatus(ticketId);
    if (!slaStatus.isBreached || !slaStatus.breachTime) {
      return { needsEscalation: false, reason: 'SLA not breached' };
    }

    const rule = getEscalationRule(ticket.priority);
    if (!rule) {
      return { needsEscalation: false, reason: 'No escalation rule found' };
    }

    const breachTime = new Date(slaStatus.breachTime);
    const now = new Date();
    const hoursSinceBreach = (now.getTime() - breachTime.getTime()) / (1000 * 60 * 60);

    // Find the appropriate escalation level
    for (const level of rule.levels) {
      if (hoursSinceBreach >= level.hoursAfterBreach) {
        // Check if already escalated to this level
        const escalatedLevels = ticket.escalationHistory || [];
        const alreadyEscalated = escalatedLevels.some(
          (e: any) => e.level === level.level
        );

        if (!alreadyEscalated) {
          return {
            needsEscalation: true,
            currentLevel: level.level,
            suggestedAction: level.action,
            reason: `SLA breached ${hoursSinceBreach.toFixed(1)} hours ago`,
          };
        }
      }
    }

    return { needsEscalation: false, reason: 'Already escalated to appropriate level' };
  } catch (error) {
    logger.error('Error checking escalation', 'escalation', {
      ticketId,
      error: (error as Error).message,
    });
    return { needsEscalation: false, reason: 'Error checking escalation' };
  }
};

/**
 * Escalate a ticket
 */
export const escalateTicket = async (
  ticketId: string
): Promise<{
  success: boolean;
  escalatedTo?: { level: number; role: string };
  message?: string;
}> => {
  try {
    const checkResult = await checkEscalation(ticketId);
    if (!checkResult.needsEscalation) {
      return {
        success: false,
        message: checkResult.reason || 'No escalation needed',
      };
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { success: false, message: 'Ticket not found' };
    }

    const rule = getEscalationRule(ticket.priority);
    if (!rule) {
      return { success: false, message: 'No escalation rule found' };
    }

    // Find the next escalation level
    const escalatedLevels = ticket.escalationHistory || [];
    let nextLevel = rule.levels[0];

    for (const level of rule.levels) {
      const alreadyEscalated = escalatedLevels.some(
        (e: any) => e.level === level.level
      );
      if (!alreadyEscalated) {
        nextLevel = level;
        break;
      }
    }

    // Find users at the escalation role
    const escalationUsers = await User.find({
      role: { $regex: nextLevel.role },
      isActive: true,
    }).select('_id');

    if (escalationUsers.length === 0) {
      return {
        success: false,
        message: `No active users found for role: ${nextLevel.role}`,
      };
    }

    // If action is 'assign', assign to first available user
    let assignedTo = undefined;
    if (nextLevel.action === 'assign') {
      assignedTo = escalationUsers[0]._id;
    }

    // Add to escalation history
    const escalationEntry = {
      level: nextLevel.level,
      role: nextLevel.role,
      action: nextLevel.action,
      escalatedAt: new Date(),
      escalatedBy: 'system',
      notes: `SLA breach escalation - ${nextLevel.role}`,
    };

    await Ticket.findByIdAndUpdate(ticketId, {
      $push: { escalationHistory: escalationEntry },
      ...(assignedTo && { assignedTo }),
      escalatedAt: new Date(),
      lastEscalatedAt: new Date(),
    });

    // Send notification
    await notifyTicketEscalated(ticket, nextLevel.level);

    logger.logBusinessStep('Ticket escalated', {
      ticketId,
      level: nextLevel.level,
      role: nextLevel.role,
      action: nextLevel.action,
    });

    return {
      success: true,
      escalatedTo: {
        level: nextLevel.level,
        role: nextLevel.role,
      },
      message: `Escalated to ${nextLevel.role}`,
    };
  } catch (error) {
    logger.error('Error escalating ticket', 'escalation', {
      ticketId,
      error: (error as Error).message,
    });
    return { success: false, message: (error as Error).message };
  }
};

/**
 * Get escalation history for a ticket
 */
export const getEscalationHistory = async (ticketId: string): Promise<any[]> => {
  try {
    const ticket = await Ticket.findById(ticketId).select('escalationHistory');
    return ticket?.escalationHistory || [];
  } catch (error) {
    logger.error('Error getting escalation history', 'escalation', {
      ticketId,
      error: (error as Error).message,
    });
    return [];
  }
};

/**
 * Get escalation statistics
 */
export const getEscalationStats = async (): Promise<{
  totalEscalations: number;
  byPriority: Record<string, number>;
  byLevel: Record<string, number>;
  avgEscalationTime: number;
}> => {
  try {
    const tickets = await Ticket.find({
      isDeleted: false,
      escalationHistory: { $exists: true, $ne: [] },
    });

    const byPriority: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    let totalEscalations = 0;
    let totalEscalationTime = 0;

    for (const ticket of tickets) {
      const history = ticket.escalationHistory || [];
      for (const entry of history) {
        totalEscalations++;
        
        byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
        byLevel[`Level ${entry.level}`] = (byLevel[`Level ${entry.level}`] || 0) + 1;

        if (entry.escalatedAt && ticket.createdAt) {
          const escalationTime = new Date(entry.escalatedAt).getTime() - 
                               new Date(ticket.createdAt).getTime();
          totalEscalationTime += escalationTime / (1000 * 60 * 60);  // hours
        }
      }
    }

    return {
      totalEscalations,
      byPriority,
      byLevel,
      avgEscalationTime: totalEscalations > 0 
        ? totalEscalationTime / totalEscalations 
        : 0,
    };
  } catch (error) {
    logger.error('Error getting escalation stats', 'escalation', {
      error: (error as Error).message,
    });
    return {
      totalEscalations: 0,
      byPriority: {},
      byLevel: {},
      avgEscalationTime: 0,
    };
  }
};

/**
 * Process all tickets for potential escalation
 */
export const processEscalations = async (): Promise<{
  processed: number;
  escalated: number;
  errors: string[];
}> => {
  try {
    const errors: string[] = [];
    let processed = 0;
    let escalated = 0;

    // Get all open tickets approaching SLA breach
    const tickets = await Ticket.find({
      isDeleted: false,
      status: { $nin: ['resolved', 'closed'] },
    }).select('_id');

    for (const ticket of tickets) {
      try {
        processed++;
        const result = await escalateTicket(ticket._id.toString());
        if (result.success) {
          escalated++;
        }
      } catch (error) {
        errors.push(`Ticket ${ticket._id}: ${(error as Error).message}`);
      }
    }

    logger.logBusinessStep('Escalation processing completed', {
      processed,
      escalated,
      errorsCount: errors.length,
    });

    return { processed, escalated, errors };
  } catch (error) {
    logger.error('Error processing escalations', 'escalation', {
      error: (error as Error).message,
    });
    return { processed: 0, escalated: 0, errors: [(error as Error).message] };
  }
};

export default {
  getEscalationRule,
  checkEscalation,
  escalateTicket,
  getEscalationHistory,
  getEscalationStats,
  processEscalations,
};
