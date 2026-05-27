import Ticket from '../models/Ticket.model.js';
import { logger } from './logger.service.js';

export interface SLAPolicy {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  firstResponseTimeHours: number;  // Target time for first response
  resolutionTimeHours: number;      // Target time for resolution
}

export interface SLABreachInfo {
  isBreached: boolean;
  breachType?: 'first_response' | 'resolution';
  breachTime?: Date;
  hoursOverdue?: number;
}

// Default SLA policies (in hours)
export const DEFAULT_SLA_POLICIES: SLAPolicy[] = [
  { priority: 'urgent', firstResponseTimeHours: 1, resolutionTimeHours: 4 },
  { priority: 'high', firstResponseTimeHours: 4, resolutionTimeHours: 24 },
  { priority: 'medium', firstResponseTimeHours: 8, resolutionTimeHours: 72 },
  { priority: 'low', firstResponseTimeHours: 24, resolutionTimeHours: 168 },  // 7 days
];

export const getSLAPolicy = (priority: string): SLAPolicy | null => {
  const policy = DEFAULT_SLA_POLICIES.find(p => p.priority === priority);
  return policy || null;
};

/**
 * Calculate SLA status for a ticket
 */
export const calculateSLAStatus = async (
  ticketId: string
): Promise<SLABreachInfo> => {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return { isBreached: false };
    }

    const policy = getSLAPolicy(ticket.priority);
    if (!policy) {
      return { isBreached: false };
    }

    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Check first response SLA
    const hasFirstResponse = ticket.messages && ticket.messages.length > 1;  // More than 1 message = has replies
    if (!hasFirstResponse && hoursElapsed > policy.firstResponseTimeHours) {
      return {
        isBreached: true,
        breachType: 'first_response',
        breachTime: new Date(createdAt.getTime() + policy.firstResponseTimeHours * 60 * 60 * 1000),
        hoursOverdue: hoursElapsed - policy.firstResponseTimeHours,
      };
    }

    // Check resolution SLA (only for open tickets)
    const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
    if (!isResolved && hoursElapsed > policy.resolutionTimeHours) {
      return {
        isBreached: true,
        breachType: 'resolution',
        breachTime: new Date(createdAt.getTime() + policy.resolutionTimeHours * 60 * 60 * 1000),
        hoursOverdue: hoursElapsed - policy.resolutionTimeHours,
      };
    }

    return { isBreached: false };
  } catch (error) {
    logger.error('Error calculating SLA status', 'sla', {
      ticketId,
      error: (error as Error).message,
    });
    return { isBreached: false };
  }
};

/**
 * Get all tickets approaching SLA breach
 */
export const getTicketsApproachingBreach = async (
  thresholdHours: number = 1
): Promise<{ tickets: any[]; count: number }> => {
  try {
    const tickets = await Ticket.find({
      isDeleted: false,
      status: { $nin: ['resolved', 'closed'] },
    }).populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    const approachingBreach: any[] = [];

    for (const ticket of tickets) {
      const slaStatus = await calculateSLAStatus(ticket._id.toString());
      
      if (slaStatus.isBreached) {
        approachingBreach.push({
          ...ticket.toObject(),
          slaStatus,
        });
      }
    }

    return {
      tickets: approachingBreach,
      count: approachingBreach.length,
    };
  } catch (error) {
    logger.error('Error getting tickets approaching breach', 'sla', {
      error: (error as Error).message,
    });
    return { tickets: [], count: 0 };
  }
};

/**
 * Get SLA statistics for dashboard
 */
export const getSLAStatistics = async (): Promise<{
  total: number;
  breached: number;
  atRisk: number;
  onTrack: number;
  breachRate: number;
}> => {
  try {
    const tickets = await Ticket.find({
      isDeleted: false,
      status: { $nin: ['resolved', 'closed'] },
    });

    let breached = 0;
    let atRisk = 0;

    for (const ticket of tickets) {
      const slaStatus = await calculateSLAStatus(ticket._id.toString());
      if (slaStatus.isBreached) {
        breached++;
      } else {
        const policy = getSLAPolicy(ticket.priority);
        if (policy) {
          const createdAt = new Date(ticket.createdAt);
          const now = new Date();
          const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          const percentageUsed = (hoursElapsed / policy.resolutionTimeHours) * 100;
          
          if (percentageUsed > 75) {
            atRisk++;
          }
        }
      }
    }

    const total = tickets.length;
    const onTrack = total - breached - atRisk;
    const breachRate = total > 0 ? (breached / total) * 100 : 0;

    return {
      total,
      breached,
      atRisk,
      onTrack,
      breachRate,
    };
  } catch (error) {
    logger.error('Error getting SLA statistics', 'sla', {
      error: (error as Error).message,
    });
    return {
      total: 0,
      breached: 0,
      atRisk: 0,
      onTrack: 0,
      breachRate: 0,
    };
  }
};

/**
 * Update ticket SLA timestamps
 */
export const updateTicketSLATimestamps = async (ticketId: string): Promise<void> => {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return;

    const policy = getSLAPolicy(ticket.priority);
    if (!policy) return;

    const createdAt = new Date(ticket.createdAt);

    // Calculate SLA deadlines
    const firstResponseDeadline = new Date(
      createdAt.getTime() + policy.firstResponseTimeHours * 60 * 60 * 1000
    );
    const resolutionDeadline = new Date(
      createdAt.getTime() + policy.resolutionTimeHours * 60 * 60 * 1000
    );

    await Ticket.findByIdAndUpdate(ticketId, {
      slaPolicy: {
        priority: ticket.priority,
        firstResponseDeadline: firstResponseDeadline.toISOString(),
        resolutionDeadline: resolutionDeadline.toISOString(),
        firstResponseTimeHours: policy.firstResponseTimeHours,
        resolutionTimeHours: policy.resolutionTimeHours,
      },
    });

    logger.logBusinessStep('Ticket SLA timestamps updated', {
      ticketId,
      priority: ticket.priority,
      firstResponseDeadline,
      resolutionDeadline,
    });
  } catch (error) {
    logger.error('Error updating SLA timestamps', 'sla', {
      ticketId,
      error: (error as Error).message,
    });
  }
};

/**
 * Check if ticket has met first response SLA
 */
export const hasMetFirstResponseSLA = (ticket: any): boolean => {
  if (!ticket.messages || ticket.messages.length <= 1) {
    return false;  // No response yet
  }

  const firstMessage = ticket.messages[0];  // Initial ticket
  const firstResponse = ticket.messages.find((m: any) => 
    m.userId?.toString() !== ticket.createdBy?.toString()
  );

  if (!firstResponse) {
    return false;
  }

  const policy = getSLAPolicy(ticket.priority);
  if (!policy) return true;

  const createdAt = new Date(ticket.createdAt);
  const responseAt = new Date(firstResponse.createdAt);
  const hoursToResponse = (responseAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return hoursToResponse <= policy.firstResponseTimeHours;
};

/**
 * Get SLA summary for a ticket
 */
export const getSLASummary = async (ticketId: string): Promise<{
  status: 'on_track' | 'at_risk' | 'breached';
  firstResponse: {
    target: string;
    actual?: string;
    met: boolean;
    hoursRemaining?: number;
    hoursOverdue?: number;
  };
  resolution: {
    target: string;
    hoursRemaining?: number;
    hoursOverdue?: number;
  };
}> => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return {
      status: 'on_track',
      firstResponse: { target: 'N/A', met: false },
      resolution: { target: 'N/A' },
    };
  }

  const policy = getSLAPolicy(ticket.priority);
  if (!policy) {
    return {
      status: 'on_track',
      firstResponse: { target: 'N/A', met: false },
      resolution: { target: 'N/A' },
    };
  }

  const createdAt = new Date(ticket.createdAt);
  const now = new Date();
  const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Calculate first response status
  const firstResponse = ticket.messages.find((m: any) =>
    m.userId?.toString() !== ticket.createdBy?.toString()
  );

  let firstResponseStatus: any = {
    target: `${policy.firstResponseTimeHours} hours`,
    met: false,
  };

  if (firstResponse) {
    const responseTime = new Date(firstResponse.createdAt);
    const hoursToResponse = (responseTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    firstResponseStatus.actual = `${hoursToResponse.toFixed(1)} hours`;
    firstResponseStatus.met = hoursToResponse <= policy.firstResponseTimeHours;
  } else {
    const hoursRemaining = policy.firstResponseTimeHours - hoursElapsed;
    if (hoursRemaining > 0) {
      firstResponseStatus.hoursRemaining = hoursRemaining;
    } else {
      firstResponseStatus.hoursOverdue = Math.abs(hoursRemaining);
    }
  }

  // Calculate resolution status
  const hoursRemaining = policy.resolutionTimeHours - hoursElapsed;
  let resolutionStatus: any = {
    target: `${policy.resolutionTimeHours} hours`,
  };

  if (hoursRemaining > 0) {
    resolutionStatus.hoursRemaining = hoursRemaining;
  } else {
    resolutionStatus.hoursOverdue = Math.abs(hoursRemaining);
  }

  // Determine overall status
  let status: 'on_track' | 'at_risk' | 'breached' = 'on_track';

  if (!firstResponseStatus.met && firstResponseStatus.hoursOverdue && firstResponseStatus.hoursOverdue > 0) {
    status = 'breached';
  } else if (hoursRemaining < 0) {
    status = 'breached';
  } else if (hoursElapsed / policy.resolutionTimeHours > 0.75) {
    status = 'at_risk';
  }

  return {
    status,
    firstResponse: firstResponseStatus,
    resolution: resolutionStatus,
  };
};

export default {
  getSLAPolicy,
  calculateSLAStatus,
  getTicketsApproachingBreach,
  getSLAStatistics,
  updateTicketSLATimestamps,
  hasMetFirstResponseSLA,
  getSLASummary,
};
