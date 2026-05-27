import nodemailer from 'nodemailer';
import SystemSettings from '../models/SystemSettings';
import { IUser } from '../types/index.js';
import { EmailOptions } from '../types/index.js';
import { logger } from './logger.service.js';
import { logExternalCall } from '../utils/externalCallLogger.js';
import { templateService } from './template.service.js';

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // false for 587 (STARTTLS), true for 465 (SSL)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Check if email notifications are enabled
 */
const isEmailEnabled = async (): Promise<boolean> => {
  try {
    const setting = await SystemSettings.findOne({
      category: 'notification',
      key: 'email_enabled',
    });
    return setting ? setting.value === true : true; // Default to true if not set
  } catch (error) {
    console.error('Error checking email settings:', error);
    return true; // Default to true on error
  }
};

/**
 * Send email with comprehensive logging
 */
export const sendEmail = async (
  { to, subject, text, html }: EmailOptions,
  correlationId?: string,
  userId?: string
): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  logger.logBusinessStep('Email send started', {
    correlationId,
    userId,
    to,
    subject
  });

  try {
    // Check if email is enabled
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      logger.info('Email notifications are disabled', 'business', {
        correlationId,
        userId,
        to,
        subject
      });
      return { success: true, message: 'Email notifications are disabled' };
    }

    const result = await logExternalCall(
      {
        service: 'email',
        endpoint: process.env.EMAIL_HOST || 'smtp',
        method: 'POST',
        correlationId,
        userId,
        logRequestBody: false,
        logResponseBody: false
      },
      async () => {
        const transporter = createTransporter();
        const mailOptions = {
          from: `Shreeyash Pratishthan <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to,
          subject,
          text,
          html,
        };
        return await transporter.sendMail(mailOptions);
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Email send failed');
    }

    logger.logBusinessStep('Email sent successfully', {
      correlationId,
      userId,
      to,
      subject,
      messageId: result.data.messageId,
      responseTime: result.responseTime
    });

    return { success: true, messageId: result.data.messageId };
  } catch (error) {
    logger.error('Email send failed', 'external', {
      correlationId,
      userId,
      to,
      subject,
      error: (error as Error).message,
      errorCode: (error as any).code,
      errorResponse: (error as any).response,
      smtpError: (error as any).code || 'Unknown SMTP error'
    }, error as Error);

    console.error('Email send error details:', {
      message: (error as Error).message,
      code: (error as any).code,
      response: (error as any).response,
      stack: (error as Error).stack
    });

    throw new Error('Failed to send email');
  }
};

/**
 * Send welcome email with logging
 */
export const sendWelcomeEmail = async (user: IUser, correlationId?: string): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  const roleName = typeof user.role === 'object' && 'name' in user.role ? user.role.name : 'User';

  const subject = 'Welcome to Shreeyash Pratishthan';
  const { html, text } = await templateService.renderEmailTemplate('welcome', {
    firstName: user.firstName,
    email: user.email,
    roleName,
  });

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  }, correlationId, user._id.toString());
};

/**
 * Send welcome email with login credentials (for admin-created users)
 */
export const sendWelcomeEmailWithCredentials = async (
  user: IUser,
  temporaryPassword: string,
  correlationId?: string
): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  const roleName = typeof user.role === 'object' && 'name' in user.role ? user.role.name : 'User';
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const subject = 'Welcome to Shreeyash Pratishthan - Your Account Details';
  const { html, text } = await templateService.renderEmailTemplate('welcome-with-credentials', {
    firstName: user.firstName,
    email: user.email,
    temporaryPassword,
    roleName,
    loginUrl,
  });

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  }, correlationId, user._id.toString());
};

/**
 * Send OTP email with logging
 */
export const sendOTPEmail = async (email: string, otp: string, purpose: string = 'login', correlationId?: string, userId?: string): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  const subject = `Your OTP for ${purpose}`;
  const { html, text } = await templateService.renderEmailTemplate('otp-verification', {
    otp,
    purpose,
    otpExpireMinutes: process.env.OTP_EXPIRE_MINUTES || 10,
  });

  return await sendEmail({
    to: email,
    subject,
    text,
    html,
  }, correlationId, userId);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const { html, text } = await templateService.renderEmailTemplate('password-reset', {
    resetUrl,
  });

  return await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/**
 * Send bill processed notification
 */
export const sendBillProcessedEmail = async (user: IUser, billDetails: any): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  const subject = 'Your Electricity Bill Has Been Processed';
  const { html, text } = await templateService.renderEmailTemplate('bill-processed', {
    firstName: user.firstName,
    billMonth: billDetails.billMonth,
    billYear: billDetails.billYear,
    totalAmount: billDetails.totalAmount,
    totalConsumption: billDetails.totalConsumption,
    dashboardUrl: `${process.env.FRONTEND_URL}/subscriber/dashboard`,
  });

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

/**
 * Send ROI calculation notification
 */
export const sendROICalculationEmail = async (user: IUser, roiDetails: any): Promise<{ success: boolean; messageId?: string; message?: string }> => {
  const subject = 'Your Solar ROI Calculation is Ready';
  const { html, text } = await templateService.renderEmailTemplate('roi-calculation', {
    firstName: user.firstName,
    estimatedMonthlySavings: roiDetails.estimatedMonthlySavings?.toLocaleString(),
    estimatedAnnualSavings: roiDetails.estimatedAnnualSavings?.toLocaleString(),
    twentyFiveYearSavings: roiDetails.twentyFiveYearSavings?.toLocaleString(),
    paybackPeriod: roiDetails.paybackPeriod,
    roi: roiDetails.roi,
    dashboardUrl: `${process.env.FRONTEND_URL}/subscriber/dashboard`,
  });

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

