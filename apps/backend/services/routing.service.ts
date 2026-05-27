import User from '../models/User.model.js';
import Ticket from '../models/Ticket.model.js';
import { logger } from './logger.service.js';

export interface RoutingRule {
  category: string;
  assignedRoles: string[];
  defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
}

// Default routing configuration
const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    category: 'billing',
    assignedRoles: ['Finance Admin', 'Admin', 'Super Admin'],
    defaultPriority: 'medium',
  },
  {
    category: 'technical',
    assignedRoles: ['Ops Admin', 'Admin', 'Super Admin'],
    defaultPriority: 'high',
  },
  {
    category: 'complaint',
    assignedRoles: ['Legal Admin', 'Admin', 'Super Admin'],
    defaultPriority: 'high',
  },
  {
    category: 'feature_request',
    assignedRoles: ['Product Admin', 'Admin', 'Super Admin'],
    defaultPriority: 'low',
  },
  {
    category: 'general',
    assignedRoles: ['Admin', 'Super Admin', 'Sales Admin'],
    defaultPriority: 'low',
  },
];

interface AgentWorkload {
  userId: string;
  openTickets: number;
  role: string;
}

/**
 * Get routing rules from environment or use defaults
 */
export const getRoutingRules = (): RoutingRule[] => {
  // In the future, this could be loaded from database
  return DEFAULT_ROUTING_RULES;
};

/**
 * Find the best agent to assign a ticket based on category and workload
 */
export const findBestAgent = async (
  category: string,
  excludeUserId?: string
): Promise<string | null> => {
  try {
    logger.logBusinessStep('Finding best agent for ticket', { category });

    const rules = getRoutingRules();
    const rule = rules.find((r) => r.category === category);

    if (!rule) {
      logger.warn(`No routing rule found for category: ${category}`, 'routing');
      return null;
    }

    // Find available agents with matching roles
    const agents = await User.find({
      role: { $in: rule.assignedRoles },
      isActive: true,
      ...(excludeUserId && { _id: { $ne: excludeUserId } }),
    }).select('_id role');

    if (agents.length === 0) {
      logger.warn(`No available agents found for category: ${category}`, 'routing');
      return null;
    }

    // Get workload for each agent
    const agentWorkloads: AgentWorkload[] = await Promise.all(
      agents.map(async (agent) => {
        const openTickets = await Ticket.countDocuments({
          assignedTo: agent._id,
          status: { $in: ['open', 'in_progress', 'waiting_customer'] },
          isDeleted: false,
        });

        return {
          userId: agent._id.toString(),
          openTickets,
          role: agent.role?.toString() || '',
        };
      })
    );

    // Sort by workload (ascending) and pick the agent with least tickets
    agentWorkloads.sort((a, b) => {
      // Priority: role order in the rule, then workload
      const roleIndexA = rule.assignedRoles.indexOf(a.role);
      const roleIndexB = rule.assignedRoles.indexOf(b.role);

      if (roleIndexA !== roleIndexB) {
        return roleIndexA - roleIndexB;
      }

      return a.openTickets - b.openTickets;
    });

    const selectedAgent = agentWorkloads[0];

    logger.logBusinessStep('Agent selected for ticket', {
      category,
      agentId: selectedAgent.userId,
      currentWorkload: selectedAgent.openTickets,
      role: selectedAgent.role,
    });

    return selectedAgent.userId;
  } catch (error) {
    logger.error('Error finding best agent', 'routing', {
      category,
      error: (error as Error).message,
    });
    return null;
  }
};

/**
 * Auto-route a ticket to the appropriate agent
 */
export const autoRouteTicket = async (
  ticketId: string,
  category: string,
  correlationId?: string
): Promise<{ success: boolean; assignedTo?: string; reason?: string }> => {
  try {
    logger.logBusinessStep('Auto-routing ticket', {
      ticketId,
      category,
      correlationId,
    });

    const assignedTo = await findBestAgent(category);

    if (!assignedTo) {
      logger.warn('Could not auto-route ticket - no suitable agent found', 'routing', {
        ticketId,
        category,
      });
      return {
        success: false,
        reason: 'No suitable agent found for category',
      };
    }

    // Update ticket with assignment
    await Ticket.findByIdAndUpdate(ticketId, {
      assignedTo,
      updatedAt: new Date(),
    });

    logger.logBusinessStep('Ticket auto-routed successfully', {
      ticketId,
      assignedTo,
      category,
    });

    return {
      success: true,
      assignedTo,
    };
  } catch (error) {
    logger.error('Error auto-routing ticket', 'routing', {
      ticketId,
      category,
      error: (error as Error).message,
    });

    return {
      success: false,
      reason: (error as Error).message,
    };
  }
};

/**
 * Reassign a ticket when agent is unavailable or overloaded
 */
export const reassignTicket = async (
  ticketId: string,
  currentAssigneeId: string
): Promise<{ success: boolean; newAssignee?: string; reason?: string }> => {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { success: false, reason: 'Ticket not found' };
    }

    const newAssignee = await findBestAgent(ticket.category, currentAssigneeId);

    if (!newAssignee) {
      return { success: false, reason: 'No alternative agent found' };
    }

    await Ticket.findByIdAndUpdate(ticketId, {
      assignedTo: newAssignee,
      updatedAt: new Date(),
    });

    return {
      success: true,
      newAssignee,
    };
  } catch (error) {
    logger.error('Error reassigning ticket', 'routing', {
      ticketId,
      error: (error as Error).message,
    });

    return {
      success: false,
      reason: (error as Error).message,
    };
  }
};

/**
 * Get routing statistics
 */
export const getRoutingStats = async () => {
  try {
    const rules = getRoutingRules();
    const stats = await Promise.all(
      rules.map(async (rule) => {
        const agents = await User.countDocuments({
          role: { $in: rule.assignedRoles },
          isActive: true,
        });

        const openTickets = await Ticket.countDocuments({
          category: rule.category,
          status: { $in: ['open', 'in_progress'] },
          isDeleted: false,
        });

        const unassigned = await Ticket.countDocuments({
          category: rule.category,
          assignedTo: { $exists: false },
          status: { $nin: ['resolved', 'closed'] },
          isDeleted: false,
        });

        return {
          category: rule.category,
          availableAgents: agents,
          openTickets,
          unassigned,
          defaultPriority: rule.defaultPriority,
        };
      })
    );

    return stats;
  } catch (error) {
    logger.error('Error getting routing stats', 'routing', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export default {
  getRoutingRules,
  findBestAgent,
  autoRouteTicket,
  reassignTicket,
  getRoutingStats,
};
