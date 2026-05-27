import { sendEmail } from './email.service.js';
import GEANotification from '../models/GEANotification.model.js';
import User from '../models/User.model.js';
import Ticket from '../models/Ticket.model.js';
import { logger } from './logger.service.js';

export type NotificationEvent = 
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'new_message'
  | 'status_changed'
  | 'sla_breach_warning'
  | 'sla_breached'
  | 'ticket_escalated'
  | 'ticket_resolved'
  | 'ticket_closed';

export interface NotificationContext {
  ticketId?: string;
  ticketNumber?: string;
  subject?: string;
  message?: string;
  oldStatus?: string;
  newStatus?: string;
  priority?: string;
  assignedTo?: string;
  assignedBy?: string;
  breachType?: string;
  hoursOverdue?: number;
  escalationLevel?: number;
}

/**
 * Send notification to GEA
 */
export const sendGEANotification = async (
  geaId: string,
  type: 'lead_status' | 'commission' | 'payment',
  title: string,
  message: string
): Promise<void> => {
  try {
    // Create in-app notification
    await GEANotification.create({
      user: geaId,
      type,
      title,
      message,
    });

    // Send email
    const user = await User.findById(geaId);
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: title,
        text: message,
        html: `<p>${message}</p>`,
      });
    }

    logger.info(`Notification sent to GEA ${geaId}: ${title}`);
  } catch (error) {
    logger.error(`Failed to send notification to GEA ${geaId}:`, 'business', undefined, error as Error);
    throw error;
  }
};

// ============================================
// TICKET NOTIFICATION FUNCTIONS
// ============================================

const TICKET_EMAIL_TEMPLATES: Record<string, { subject: string; getHtml: (ctx: NotificationContext) => string; getText: (ctx: NotificationContext) => string }> = {
  'ticket_created': {
    subject: 'Support Ticket Created - {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2>Your Support Ticket Has Been Created</h2>
      <p>Dear Customer,</p>
      <p>We've received your support request and will get back to you shortly.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <p><strong>Priority:</strong> ${ctx.priority}</p>
        <p><strong>Status:</strong> Open</p>
      </div>
      <p>Our team will review your request and respond within the SLA timeframe.</p>
    `,
    getText: (ctx) => `
      Your Support Ticket Has Been Created
      
      Ticket Number: ${ctx.ticketNumber}
      Subject: ${ctx.subject}
      Priority: ${ctx.priority}
      Status: Open
      
      Our team will review your request and respond within the SLA timeframe.
    `,
  },

  'ticket_assigned': {
    subject: 'New Ticket Assigned - {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2>New Ticket Assigned to You</h2>
      <p>Hello,</p>
      <p>A new support ticket has been assigned to you.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <p><strong>Priority:</strong> ${ctx.priority}</p>
        <p><strong>Assigned By:</strong> ${ctx.assignedBy}</p>
      </div>
      <p>Please review and respond to this ticket as soon as possible to meet our SLA targets.</p>
    `,
    getText: (ctx) => `
      New Ticket Assigned to You
      
      Ticket Number: ${ctx.ticketNumber}
      Subject: ${ctx.subject}
      Priority: ${ctx.priority}
      Assigned By: ${ctx.assignedBy}
      
      Please review and respond to this ticket as soon as possible.
    `,
  },

  'new_message': {
    subject: 'New Message on Ticket {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2>New Message on Your Support Ticket</h2>
      <p>Dear Customer,</p>
      <p>There's a new message on your support ticket.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <div style="border-left: 3px solid #007bff; padding-left: 15px; margin: 15px 0;">
          <p><strong>Message:</strong></p>
          <p>${ctx.message}</p>
        </div>
      </div>
      <p>You can view the full conversation and reply from your dashboard.</p>
    `,
    getText: (ctx) => `
      New Message on Your Support Ticket
      
      Ticket Number: ${ctx.ticketNumber}
      Subject: ${ctx.subject}
      Message: ${ctx.message}
      
      You can view the full conversation and reply from your dashboard.
    `,
  },

  'status_changed': {
    subject: 'Ticket Status Updated - {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2>Ticket Status Updated</h2>
      <p>Dear Customer,</p>
      <p>The status of your support ticket has been updated.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <p><strong>Previous Status:</strong> ${ctx.oldStatus}</p>
        <p><strong>New Status:</strong> <span style="color: #28a745; font-weight: bold;">${ctx.newStatus}</span></p>
      </div>
      ${ctx.newStatus === 'resolved' ? '<p>Your ticket has been resolved. If you have any further questions, please reply to this email.</p>' : ''}
    `,
    getText: (ctx) => `
      Ticket Status Updated
      
      Ticket Number: ${ctx.ticketNumber}
      Previous Status: ${ctx.oldStatus}
      New Status: ${ctx.newStatus}
    `,
  },

  'sla_breach_warning': {
    subject: 'SLA Warning - Ticket {{ticketNumber}} Approaching Deadline',
    getHtml: (ctx) => `
      <h2 style="color: #dc3545;">SLA Warning - Approaching Deadline</h2>
      <p>Attention,</p>
      <p>This ticket is approaching its SLA deadline and requires immediate attention.</p>
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <p><strong>Priority:</strong> ${ctx.priority}</p>
        <p><strong>Hours Until Breach:</strong> ${ctx.hoursOverdue}</p>
      </div>
      <p>Please take immediate action to respond to this ticket.</p>
    `,
    getText: (ctx) => `
      SLA Warning - Approaching Deadline
      
      Ticket Number: ${ctx.ticketNumber}
      Priority: ${ctx.priority}
      Hours Until Breach: ${ctx.hoursOverdue}
      
      Please take immediate action to respond to this ticket.
    `,
  },

  'sla_breached': {
    subject: 'SLA BREACHED - Ticket {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2 style="color: #dc3545;">SLA BREACHED</h2>
      <p>Critical Alert:</p>
      <p>This ticket has exceeded its SLA deadline and requires immediate escalation.</p>
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <p><strong>Priority:</strong> ${ctx.priority}</p>
        <p><strong>Breach Type:</strong> ${ctx.breachType}</p>
        <p><strong>Hours Overdue:</strong> ${ctx.hoursOverdue}</p>
      </div>
      <p>Immediate action is required. This ticket has been escalated.</p>
    `,
    getText: (ctx) => `
      SLA BREACHED
      
      Ticket Number: ${ctx.ticketNumber}
      Priority: ${ctx.priority}
      Breach Type: ${ctx.breachType}
      Hours Overdue: ${ctx.hoursOverdue}
      
      Immediate action is required. This ticket has been escalated.
    `,
  },

  'ticket_escalated': {
    subject: 'Ticket Escalated - {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2>Ticket Escalated</h2>
      <p>This ticket has been escalated to a higher support level.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
        <p><strong>Escalation Level:</strong> ${ctx.escalationLevel}</p>
        <p><strong>Reason:</strong> SLA Breach</p>
      </div>
      <p>Additional resources have been assigned to resolve this issue.</p>
    `,
    getText: (ctx) => `
      Ticket Escalated
      
      Ticket Number: ${ctx.ticketNumber}
      Escalation Level: ${ctx.escalationLevel}
      Reason: SLA Breach
      
      Additional resources have been assigned to resolve this issue.
    `,
  },

  'ticket_resolved': {
    subject: 'Ticket Resolved - {{ticketNumber}}',
    getHtml: (ctx) => `
      <h2>Your Support Ticket Has Been Resolved</h2>
      <p>Great news!</p>
      <p>Your support ticket has been resolved by our team.</p>
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #28a745;">
        <p><strong>Ticket Number:</strong> ${ctx.ticketNumber}</p>
        <p><strong>Subject:</strong> ${ctx.subject}</p>
      </div>
      <p>If you have any additional questions, please reply to this email within 48 hours. Otherwise, the ticket will be automatically closed.</p>
    `,
    getText: (ctx) => `
      Your Support Ticket Has Been Resolved
      
      Ticket Number: ${ctx.ticketNumber}
      Subject: ${ctx.subject}
      
      If you have any additional questions, please reply to this email.
    `,
  },
};

/**
 * Send ticket notification email
 */
const sendTicketNotificationEmail = async (
  email: string,
  event: NotificationEvent,
  context: NotificationContext,
  correlationId?: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const template = TICKET_EMAIL_TEMPLATES[event];
    if (!template) {
      logger.warn(`Unknown notification event: ${event}`, 'business');
      return { success: false, message: 'Unknown event type' };
    }

    const subject = template.subject.replace('{{ticketNumber}}', context.ticketNumber || '');
    const html = template.getHtml(context);
    const text = template.getText(context);

    const result = await sendEmail({
      to: email,
      subject,
      text,
      html,
    }, correlationId);

    return result;
  } catch (error) {
    logger.error('Failed to send notification email', 'business', {
      email,
      event,
      error: (error as Error).message,
    });
    return { success: false, message: (error as Error).message };
  }
};

/**
 * Send ticket created notification
 */
export const notifyTicketCreated = async (
  ticket: any,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const customer = await User.findById(ticketData.createdBy).select('email firstName');
    if (!customer) return { success: false };

    const result = await sendTicketNotificationEmail(
      customer.email,
      'ticket_created',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        priority: ticketData.priority,
      },
      correlationId
    );

    logger.logBusinessStep('Ticket created notification sent', {
      ticketNumber: ticketData.ticketNumber,
      customerEmail: customer.email,
      success: result.success,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send ticket created notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send ticket assigned notification
 */
export const notifyTicketAssigned = async (
  ticket: any,
  assignee: any,
  assignedBy: any,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const result = await sendTicketNotificationEmail(
      assignee.email,
      'ticket_assigned',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        priority: ticketData.priority,
        assignedTo: assignee._id.toString(),
        assignedBy: assignedBy?.firstName + ' ' + assignedBy?.lastName || 'System',
      },
      correlationId
    );

    return result;
  } catch (error) {
    logger.error('Failed to send ticket assigned notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send new message notification
 */
export const notifyNewMessage = async (
  ticket: any,
  recipient: any,
  message: string,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const result = await sendTicketNotificationEmail(
      recipient.email,
      'new_message',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        message,
      },
      correlationId
    );

    return result;
  } catch (error) {
    logger.error('Failed to send new message notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send status change notification
 */
export const notifyStatusChanged = async (
  ticket: any,
  customer: any,
  oldStatus: string,
  newStatus: string,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const result = await sendTicketNotificationEmail(
      customer.email,
      'status_changed',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        oldStatus,
        newStatus,
      },
      correlationId
    );

    return result;
  } catch (error) {
    logger.error('Failed to send status change notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send SLA breach warning
 */
export const notifySLAWarning = async (
  ticket: any,
  hoursUntilBreach: number,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const assignee = await User.findById(ticketData.assignedTo).select('email firstName lastName');
    if (!assignee) return { success: false };

    const result = await sendTicketNotificationEmail(
      assignee.email,
      'sla_breach_warning',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        priority: ticketData.priority,
        hoursOverdue: hoursUntilBreach,
      },
      correlationId
    );

    logger.logBusinessStep('SLA warning notification sent', {
      ticketNumber: ticketData.ticketNumber,
      assigneeEmail: assignee.email,
      hoursUntilBreach,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send SLA warning notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send SLA breach notification
 */
export const notifySLABreached = async (
  ticket: any,
  breachType: string,
  hoursOverdue: number,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const assignee = await User.findById(ticketData.assignedTo).select('email firstName lastName');
    const managers = await User.find({
      role: { $in: ['Admin', 'Super Admin'] },
      isActive: true,
    }).select('email firstName lastName');

    const recipients = [assignee, ...managers].filter(u => u && u.email);
    const uniqueRecipients = [...new Set(recipients.map((r) => r?.email || '').filter((e) => e))];

    const results = await Promise.all(
      uniqueRecipients.map(email =>
        sendTicketNotificationEmail(
          email,
          'sla_breached',
          {
            ticketId: ticketData._id.toString(),
            ticketNumber: ticketData.ticketNumber,
            subject: ticketData.subject,
            priority: ticketData.priority,
            breachType,
            hoursOverdue,
          },
          correlationId
        )
      )
    );

    const successCount = results.filter(r => r.success).length;
    logger.logBusinessStep('SLA breach notifications sent', {
      ticketNumber: ticketData.ticketNumber,
      recipientsCount: uniqueRecipients.length,
      successCount,
    });

    return { success: successCount > 0 };
  } catch (error) {
    logger.error('Failed to send SLA breach notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send ticket escalated notification
 */
export const notifyTicketEscalated = async (
  ticket: any,
  escalationLevel: number,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const assignee = await User.findById(ticketData.assignedTo).select('email firstName lastName');
    if (!assignee) return { success: false };

    const result = await sendTicketNotificationEmail(
      assignee.email,
      'ticket_escalated',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        priority: ticketData.priority,
        escalationLevel,
      },
      correlationId
    );

    return result;
  } catch (error) {
    logger.error('Failed to send escalation notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};

/**
 * Send ticket resolved notification
 */
export const notifyTicketResolved = async (
  ticket: any,
  customer: any,
  correlationId?: string
): Promise<{ success: boolean }> => {
  try {
    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    const result = await sendTicketNotificationEmail(
      customer.email,
      'ticket_resolved',
      {
        ticketId: ticketData._id.toString(),
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
      },
      correlationId
    );

    return result;
  } catch (error) {
    logger.error('Failed to send ticket resolved notification', 'business', {
      ticketId: ticket._id,
      error: (error as Error).message,
    });
    return { success: false };
  }
};