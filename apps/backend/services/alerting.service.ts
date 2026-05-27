import { EventEmitter } from 'events';
import { logger } from './logger.service.js';
import { sendEmail } from './email.service.js';

export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  enabled: boolean;
  config: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  channels: string[];
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export class AlertingService extends EventEmitter {
  private channels: Map<string, AlertChannel> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();

  constructor() {
    super();
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert channels
   */
  private initializeDefaultChannels(): void {
    // Email channel
    this.channels.set('email-admin', {
      id: 'email-admin',
      type: 'email',
      enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
      config: {
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        subjectPrefix: '[ALERT] NewRa Grids'
      }
    });

    // Slack webhook channel
    this.channels.set('slack-webhook', {
      id: 'slack-webhook',
      type: 'webhook',
      enabled: process.env.ALERT_SLACK_ENABLED === 'true',
      config: {
        url: process.env.ALERT_SLACK_WEBHOOK_URL,
        username: 'NewRa Grids Alert Bot',
        icon: ':warning:'
      }
    });

    // Generic webhook channel
    this.channels.set('webhook-generic', {
      id: 'webhook-generic',
      type: 'webhook',
      enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
      config: {
        url: process.env.ALERT_WEBHOOK_URL,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ALERT_WEBHOOK_API_KEY
        }
      }
    });
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // Critical alerts
    this.rules.set('critical-alerts', {
      id: 'critical-alerts',
      name: 'Critical Alerts',
      condition: 'severity == "critical"',
      channels: ['email-admin', 'slack-webhook'],
      enabled: true,
      cooldownMinutes: 5
    });

    // High priority alerts
    this.rules.set('high-alerts', {
      id: 'high-alerts',
      name: 'High Priority Alerts',
      condition: 'severity == "high"',
      channels: ['email-admin', 'slack-webhook'],
      enabled: true,
      cooldownMinutes: 15
    });

    // Medium priority alerts
    this.rules.set('medium-alerts', {
      id: 'medium-alerts',
      name: 'Medium Priority Alerts',
      condition: 'severity == "medium"',
      channels: ['email-admin'],
      enabled: true,
      cooldownMinutes: 30
    });

    // System health alerts
    this.rules.set('system-health', {
      id: 'system-health',
      name: 'System Health Alerts',
      condition: 'metric.startsWith("system.")',
      channels: ['email-admin'],
      enabled: true,
      cooldownMinutes: 60
    });

    // Performance alerts
    this.rules.set('performance-alerts', {
      id: 'performance-alerts',
      name: 'Performance Alerts',
      condition: 'metric.includes("performance") || metric.includes("response")',
      channels: ['email-admin', 'slack-webhook'],
      enabled: true,
      cooldownMinutes: 30
    });
  }

  /**
   * Process an incoming alert
   */
  public async processAlert(alert: Alert): Promise<void> {
    try {
      // Check if alert is already active (prevent spam)
      const alertKey = `${alert.id}-${alert.metric}`;
      const existingAlert = this.activeAlerts.get(alertKey);

      if (existingAlert) {
        const timeSinceLastAlert = Date.now() - existingAlert.timestamp.getTime();
        const cooldownMs = this.getCooldownForAlert(alert) * 60 * 1000;

        if (timeSinceLastAlert < cooldownMs) {
          logger.debug('Alert suppressed due to cooldown', 'system', {
            alertId: alert.id,
            timeSinceLastAlert: Math.round(timeSinceLastAlert / 1000),
            cooldownSeconds: cooldownMs / 1000
          });
          return;
        }
      }

      // Update active alerts
      this.activeAlerts.set(alertKey, alert);

      // Find matching rules
      const matchingRules = Array.from(this.rules.values()).filter(rule =>
        rule.enabled && this.matchesRule(alert, rule)
      );

      if (matchingRules.length === 0) {
        logger.debug('No matching alert rules found', 'system', { alertId: alert.id });
        return;
      }

      // Send alert through all matching channels
      const notifications = matchingRules.map(rule =>
        this.sendAlertThroughChannels(alert, rule.channels)
      );

      await Promise.allSettled(notifications);

      logger.info('Alert processed and notifications sent', 'system', {
        alertId: alert.id,
        severity: alert.severity,
        matchingRules: matchingRules.length,
        channels: matchingRules.flatMap(rule => rule.channels)
      });

      this.emit('alert-processed', { alert, rules: matchingRules });

    } catch (error) {
      logger.error('Failed to process alert', 'system', {
        alertId: alert.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Send alert through specified channels
   */
  private async sendAlertThroughChannels(alert: Alert, channelIds: string[]): Promise<void> {
    const enabledChannels = channelIds
      .map(id => this.channels.get(id))
      .filter(channel => channel?.enabled);

    const sendPromises = enabledChannels.map(channel =>
      this.sendAlertToChannel(alert, channel!)
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send alert to a specific channel
   */
  private async sendAlertToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(alert, channel);
          break;
        case 'slack':
        case 'webhook':
          await this.sendWebhookAlert(alert, channel);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, channel);
          break;
        default:
          logger.warn('Unknown alert channel type', 'system', {
            channelId: channel.id,
            type: channel.type
          });
      }

      this.emit('alert-sent', { alert, channel });

    } catch (error) {
      logger.error('Failed to send alert to channel', 'system', {
        alertId: alert.id,
        channelId: channel.id,
        channelType: channel.type,
        error: (error as Error).message
      });

      this.emit('alert-send-failed', { alert, channel, error });
    }
  }

  /**
   * Send alert via email
   */
  private async sendEmailAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    const recipients = channel.config.recipients as string[];
    if (!recipients || recipients.length === 0) return;

    const subject = `${channel.config.subjectPrefix || '[ALERT]'} ${alert.name}`;
    const html = this.generateAlertEmailHTML(alert);
    const text = this.generateAlertEmailText(alert);

    const emailPromises = recipients.map(recipient =>
      sendEmail({
        to: recipient,
        subject,
        text,
        html
      })
    );

    await Promise.all(emailPromises);
  }

  /**
   * Send alert via webhook
   */
  private async sendWebhookAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    const url = channel.config.url as string;
    if (!url) return;

    const payload = {
      alert: {
        id: alert.id,
        name: alert.name,
        description: alert.description,
        severity: alert.severity,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        timestamp: alert.timestamp.toISOString()
      },
      source: 'newra-grids-monitoring',
      ...channel.config.extraPayload
    };

    const headers = {
      'Content-Type': 'application/json',
      ...channel.config.headers
    };

    // In a real implementation, this would make an HTTP request
    // For now, we'll log the payload
    logger.info('Webhook alert payload prepared', 'system', {
      channelId: channel.id,
      url,
      payload
    });
  }

  /**
   * Send alert via SMS (placeholder)
   */
  private async sendSMSAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    // Placeholder for SMS implementation
    logger.info('SMS alert not implemented', 'system', {
      alertId: alert.id,
      channelId: channel.id
    });
  }

  /**
   * Generate HTML email content for alert
   */
  private generateAlertEmailHTML(alert: Alert): string {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    const color = severityColors[alert.severity];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Alert: ${alert.name}</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="border-left: 4px solid ${color}; padding-left: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: ${color}; text-transform: uppercase; font-size: 18px;">
              ${alert.severity.toUpperCase()} ALERT
            </h2>
          </div>

          <h1 style="margin: 0 0 10px 0; color: #333;">${alert.name}</h1>
          <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">${alert.description}</p>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 3px; margin-bottom: 20px;">
            <strong>Metric:</strong> ${alert.metric}<br>
            <strong>Current Value:</strong> ${alert.value}<br>
            <strong>Threshold:</strong> ${alert.threshold}<br>
            <strong>Time:</strong> ${alert.timestamp.toISOString()}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This alert was generated by NewRa Grids monitoring system.</p>
            <p>Please investigate and resolve the issue promptly.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text email content for alert
   */
  private generateAlertEmailText(alert: Alert): string {
    return `
ALERT: ${alert.name.toUpperCase()}

${alert.description}

Severity: ${alert.severity.toUpperCase()}
Metric: ${alert.metric}
Current Value: ${alert.value}
Threshold: ${alert.threshold}
Time: ${alert.timestamp.toISOString()}

This alert was generated by NewRa Grids monitoring system.
Please investigate and resolve the issue promptly.
    `.trim();
  }

  /**
   * Check if alert matches a rule
   */
  private matchesRule(alert: Alert, rule: AlertRule): boolean {
    // Simple condition evaluation - in production, you'd want a more sophisticated rule engine
    const conditions = Array.isArray(rule.condition) ? rule.condition : [rule.condition];

    return conditions.some(condition => {
      if (condition.includes('severity ==')) {
        const severity = condition.split('"')[1];
        return alert.severity === severity;
      }

      if (condition.includes('metric.startsWith')) {
        const prefix = condition.split('"')[1];
        return alert.metric.startsWith(prefix);
      }

      if (condition.includes('metric.includes')) {
        const search = condition.split('"')[1];
        return alert.metric.includes(search);
      }

      return false;
    });
  }

  /**
   * Get cooldown period for alert
   */
  private getCooldownForAlert(alert: Alert): number {
    // Find the most restrictive cooldown from matching rules
    const matchingRules = Array.from(this.rules.values()).filter(rule =>
      rule.enabled && this.matchesRule(alert, rule)
    );

    return Math.max(...matchingRules.map(rule => rule.cooldownMinutes), 5); // Minimum 5 minutes
  }

  /**
   * Add a new alert channel
   */
  public addChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
    logger.info('Alert channel added', 'system', { channelId: channel.id, type: channel.type });
  }

  /**
   * Update an alert channel
   */
  public updateChannel(channelId: string, updates: Partial<AlertChannel>): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      Object.assign(channel, updates);
      logger.info('Alert channel updated', 'system', { channelId, updates });
    }
  }

  /**
   * Remove an alert channel
   */
  public removeChannel(channelId: string): void {
    this.channels.delete(channelId);
    logger.info('Alert channel removed', 'system', { channelId });
  }

  /**
   * Add a new alert rule
   */
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', 'system', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Update an alert rule
   */
  public updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      logger.info('Alert rule updated', 'system', { ruleId, updates });
    }
  }

  /**
   * Remove an alert rule
   */
  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info('Alert rule removed', 'system', { ruleId });
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Clear resolved alerts
   */
  public clearResolvedAlerts(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);

    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp.getTime() < cutoffTime) {
        this.activeAlerts.delete(key);
      }
    }

    logger.info('Resolved alerts cleared', 'system', { clearedCount: this.activeAlerts.size });
  }

  /**
   * Get channels and rules configuration
   */
  public getConfiguration() {
    return {
      channels: Array.from(this.channels.values()),
      rules: Array.from(this.rules.values()),
      activeAlertsCount: this.activeAlerts.size
    };
  }
}

// Export singleton instance
export const alertingService = new AlertingService();

// Connect metrics service alerts to alerting service
import { metricsService } from './metrics.service.js';

metricsService.on('alert-triggered', (alert: Alert) => {
  alertingService.processAlert(alert);
});










































