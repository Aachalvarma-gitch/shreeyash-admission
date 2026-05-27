import Ticket from '../models/Ticket.model.js';
import User from '../models/User.model.js';
import { logger } from './logger.service.js';

export interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  avgResolutionTime: number;
  avgFirstResponseTime: number;
  slaComplianceRate: number;
  escalationRate: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalAssigned: number;
  resolved: number;
  avgResolutionTime: number;
  avgFirstResponseTime: number;
  slaBreaches: number;
  satisfactionScore?: number;
}

export interface TicketTrend {
  date: string;
  created: number;
  resolved: number;
  open: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
  avgResolutionTime: number;
}

export interface SLACompliance {
  total: number;
  complied: number;
  breached: number;
  complianceRate: number;
  byPriority: Record<string, { complied: number; breached: number; rate: number }>;
}

export interface TimeSeriesData {
  period: string;
  value: number;
}

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(endDate.getMonth() - 1);
  }

  return { startDate, endDate };
};

const calculateResolutionTime = (ticket: any): number | null => {
  if (!ticket.resolvedAt) return null;
  const createdAt = new Date(ticket.createdAt).getTime();
  const resolvedAt = new Date(ticket.resolvedAt).getTime();
  return (resolvedAt - createdAt) / (1000 * 60 * 60);
};

const calculateFirstResponseTime = (ticket: any): number | null => {
  if (!ticket.messages || ticket.messages.length < 2) return null;
  const createdAt = new Date(ticket.createdAt).getTime();
  const firstResponse = ticket.messages.find((m: any) => m.userId?.toString() !== ticket.createdBy?.toString());
  if (!firstResponse) return null;
  const responseAt = new Date(firstResponse.createdAt).getTime();
  return (responseAt - createdAt) / (1000 * 60 * 60);
};

export const getTicketAnalytics = async (
  startDate?: Date,
  endDate?: Date,
  category?: string
): Promise<TicketAnalytics> => {
  try {
    const query: any = { isDeleted: false };

    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (category) {
      query.category = category;
    }

    const tickets = await Ticket.find(query);

    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    let totalResolutionTime = 0;
    let resolutionCount = 0;
    let totalFirstResponseTime = 0;
    let firstResponseCount = 0;
    let slaBreaches = 0;

    tickets.forEach((ticket) => {
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;

      const resolutionTime = calculateResolutionTime(ticket);
      if (resolutionTime !== null) {
        totalResolutionTime += resolutionTime;
        resolutionCount++;
      }

      const firstResponseTime = calculateFirstResponseTime(ticket);
      if (firstResponseTime !== null) {
        totalFirstResponseTime += firstResponseTime;
        firstResponseCount++;
      }

      if ((ticket as any).escalationHistory?.length > 0) {
        slaBreaches++;
      }
    });

    const sortedByPriority = Object.entries(byPriority).sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a[0] as keyof typeof PRIORITY_ORDER] || 0;
      const priorityB = PRIORITY_ORDER[b[0] as keyof typeof PRIORITY_ORDER] || 0;
      return priorityB - priorityA;
    });

    const sortedByCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === 'open').length,
      inProgressTickets: tickets.filter((t) => t.status === 'in_progress').length,
      resolvedTickets: tickets.filter((t) => t.status === 'resolved').length,
      closedTickets: tickets.filter((t) => t.status === 'closed').length,
      byPriority: Object.fromEntries(sortedByPriority),
      byCategory: Object.fromEntries(sortedByCategory),
      byStatus,
      avgResolutionTime: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
      avgFirstResponseTime: firstResponseCount > 0 ? totalFirstResponseTime / firstResponseCount : 0,
      slaComplianceRate: tickets.length > 0 ? ((tickets.length - slaBreaches) / tickets.length) * 100 : 100,
      escalationRate: tickets.length > 0 ? (slaBreaches / tickets.length) * 100 : 0,
    };
  } catch (error) {
    logger.error('Error getting ticket analytics', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getAgentPerformance = async (
  startDate?: Date,
  endDate?: Date
): Promise<AgentPerformance[]> => {
  try {
    const query: any = { isDeleted: false };

    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query).populate('assignedTo', 'firstName lastName email');

    const agentMap = new Map<string, AgentPerformance>();

    tickets.forEach((ticket) => {
      if (!ticket.assignedTo) return;

      const agentId = (ticket.assignedTo as any)._id.toString();
      const agentName = `${(ticket.assignedTo as any).firstName} ${(ticket.assignedTo as any).lastName}`;

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agentId,
          agentName,
          totalAssigned: 0,
          resolved: 0,
          avgResolutionTime: 0,
          avgFirstResponseTime: 0,
          slaBreaches: 0,
        });
      }

      const agent = agentMap.get(agentId)!;
      agent.totalAssigned++;

      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        agent.resolved++;
      }

      const resolutionTime = calculateResolutionTime(ticket);
      if (resolutionTime !== null) {
        agent.avgResolutionTime =
          (agent.avgResolutionTime * (agent.resolved - 1) + resolutionTime) / agent.resolved;
      }

      const firstResponseTime = calculateFirstResponseTime(ticket);
      if (firstResponseTime !== null) {
        const responsesWithTime = agent.totalAssigned > 1 ? agent.totalAssigned - 1 : 1;
        agent.avgFirstResponseTime =
          (agent.avgFirstResponseTime * (responsesWithTime - 1) + firstResponseTime) / responsesWithTime;
      }

      if ((ticket as any).escalationHistory?.length > 0) {
        agent.slaBreaches++;
      }
    });

    const performance = Array.from(agentMap.values()).sort((a, b) => b.totalAssigned - a.totalAssigned);

    return performance;
  } catch (error) {
    logger.error('Error getting agent performance', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getTicketTrends = async (period: string = 'month'): Promise<TicketTrend[]> => {
  try {
    const { startDate, endDate } = getDateRange(period);
    const tickets = await Ticket.find({
      isDeleted: false,
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: 1 });

    const dailyData = new Map<string, { created: number; resolved: number }>();

    tickets.forEach((ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { created: 0, resolved: 0 });
      }
      dailyData.get(date)!.created++;
    });

    tickets.forEach((ticket) => {
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const resolvedDate = new Date(ticket.resolvedAt || ticket.updatedAt).toISOString().split('T')[0];
        if (dailyData.has(resolvedDate)) {
          dailyData.get(resolvedDate)!.resolved++;
        }
      }
    });

    let currentOpen = 0;
    const trends: TicketTrend[] = Array.from(dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => {
        currentOpen = currentOpen + data.created - data.resolved;
        return {
          date,
          created: data.created,
          resolved: data.resolved,
          open: currentOpen,
        };
      });

    return trends;
  } catch (error) {
    logger.error('Error getting ticket trends', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getCategoryDistribution = async (
  startDate?: Date,
  endDate?: Date
): Promise<CategoryDistribution[]> => {
  try {
    const query: any = { isDeleted: false };

    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query);
    const total = tickets.length;

    if (total === 0) return [];

    const categoryMap = new Map<string, { count: number; totalResolutionTime: number }>();

    tickets.forEach((ticket) => {
      if (!categoryMap.has(ticket.category)) {
        categoryMap.set(ticket.category, { count: 0, totalResolutionTime: 0 });
      }

      const category = categoryMap.get(ticket.category)!;
      category.count++;

      const resolutionTime = calculateResolutionTime(ticket);
      if (resolutionTime !== null) {
        category.totalResolutionTime += resolutionTime;
      }
    });

    const distribution: CategoryDistribution[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        percentage: (data.count / total) * 100,
        avgResolutionTime: data.count > 0 ? data.totalResolutionTime / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return distribution;
  } catch (error) {
    logger.error('Error getting category distribution', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getSLACompliance = async (startDate?: Date, endDate?: Date): Promise<SLACompliance> => {
  try {
    const query: any = { isDeleted: false };

    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query);
    const total = tickets.length;

    let complied = 0;
    let breached = 0;
    const byPriority: Record<string, { complied: number; breached: number; rate: number }> = {};

    tickets.forEach((ticket) => {
      const hasBreach = (ticket as any).escalationHistory?.length > 0;

      if (!hasBreach) {
        complied++;
      } else {
        breached++;
      }

      if (!byPriority[ticket.priority]) {
        byPriority[ticket.priority] = { complied: 0, breached: 0, rate: 0 };
      }

      if (!hasBreach) {
        byPriority[ticket.priority].complied++;
      } else {
        byPriority[ticket.priority].breached++;
      }
    });

    Object.keys(byPriority).forEach((priority) => {
      const totalPriority = byPriority[priority].complied + byPriority[priority].breached;
      byPriority[priority].rate = totalPriority > 0 ? (byPriority[priority].complied / totalPriority) * 100 : 100;
    });

    return {
      total,
      complied,
      breached,
      complianceRate: total > 0 ? (complied / total) * 100 : 100,
      byPriority,
    };
  } catch (error) {
    logger.error('Error getting SLA compliance', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getPeakHours = async (startDate?: Date, endDate?: Date): Promise<TimeSeriesData[]> => {
  try {
    const query: any = { isDeleted: false };

    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query).select('createdAt');

    const hourlyData = new Array(24).fill(0);

    tickets.forEach((ticket) => {
      const hour = new Date(ticket.createdAt).getHours();
      hourlyData[hour]++;
    });

    const peakHours: TimeSeriesData[] = hourlyData.map((value, hour) => ({
      period: `${hour.toString().padStart(2, '0')}:00`,
      value,
    }));

    return peakHours;
  } catch (error) {
    logger.error('Error getting peak hours', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getWeeklyPattern = async (weeks: number = 4): Promise<TimeSeriesData[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const tickets = await Ticket.find({
      isDeleted: false,
      createdAt: { $gte: startDate },
    }).select('createdAt');

    const dayData = new Array(7).fill(0);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    tickets.forEach((ticket) => {
      const day = new Date(ticket.createdAt).getDay();
      dayData[day]++;
    });

    const weeklyPattern: TimeSeriesData[] = dayNames.map((day, index) => ({
      period: day,
      value: dayData[index],
    }));

    return weeklyPattern;
  } catch (error) {
    logger.error('Error getting weekly pattern', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const getDashboardSummary = async (): Promise<{
  today: TicketAnalytics;
  week: TicketAnalytics;
  month: TicketAnalytics;
  trends: TicketTrend[];
  topCategories: CategoryDistribution[];
  slaCompliance: SLACompliance;
}> => {
  try {
    const [today, week, month] = await Promise.all([
      getTicketAnalytics(...Object.values(getDateRange('today'))),
      getTicketAnalytics(...Object.values(getDateRange('week'))),
      getTicketAnalytics(...Object.values(getDateRange('month'))),
    ]);

    const [trends, topCategories, slaCompliance] = await Promise.all([
      getTicketTrends('month'),
      getCategoryDistribution(...Object.values(getDateRange('month'))),
      getSLACompliance(...Object.values(getDateRange('month'))),
    ]);

    return {
      today,
      week,
      month,
      trends,
      topCategories: topCategories.slice(0, 5),
      slaCompliance,
    };
  } catch (error) {
    logger.error('Error getting dashboard summary', 'business', {
      error: (error as Error).message,
    });
    throw error;
  }
};

export default {
  getTicketAnalytics,
  getAgentPerformance,
  getTicketTrends,
  getCategoryDistribution,
  getSLACompliance,
  getPeakHours,
  getWeeklyPattern,
  getDashboardSummary,
};
