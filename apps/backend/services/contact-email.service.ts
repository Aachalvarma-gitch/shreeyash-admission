import { sendEmail } from './email.service.js';
import { templateService } from './template.service.js';

interface ContactInquiryData {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  subject: string;
  message: string;
  status: string;
  response?: string;
  createdAt: Date;
}

export const sendContactAcknowledgment = async (inquiry: ContactInquiryData): Promise<{ success: boolean; messageId?: string }> => {
  const subject = 'We Received Your Inquiry - Shreeyash Pratishthan';
  const { html, text } = await templateService.renderEmailTemplate('contact-acknowledgment', {
    firstName: inquiry.name,
    subject: inquiry.subject,
    inquiryId: inquiry._id.toString(),
    submittedAt: new Date(inquiry.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });

  return await sendEmail({
    to: inquiry.email,
    subject,
    text,
    html,
  });
};

export const sendContactResponse = async (inquiry: ContactInquiryData): Promise<{ success: boolean; messageId?: string }> => {
  const statusText = inquiry.status === 'RESOLVED' ? 'Resolved' : 'Noted';
  const subject = `Your Inquiry Status Update - ${inquiry.subject}`;
  const { html, text } = await templateService.renderEmailTemplate('contact-response', {
    firstName: inquiry.name,
    originalSubject: inquiry.subject,
    status: statusText,
    response: inquiry.response || 'Thank you for contacting us.',
    inquiryId: inquiry._id.toString(),
  });

  return await sendEmail({
    to: inquiry.email,
    subject,
    text,
    html,
  });
};

export const sendContactNotificationToAdmin = async (inquiry: ContactInquiryData): Promise<{ success: boolean; messageId?: string }> => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sycet.org';
  const subject = `New Inquiry: ${inquiry.subject} - From ${inquiry.name}`;
  const { html, text } = await templateService.renderEmailTemplate('contact-notification', {
    inquiryId: inquiry._id.toString(),
    name: inquiry.name,
    email: inquiry.email,
    mobile: inquiry.mobile,
    subject: inquiry.subject,
    message: inquiry.message,
    submittedAt: new Date(inquiry.createdAt).toLocaleDateString('en-IN'),
  });

  return await sendEmail({
    to: adminEmail,
    subject,
    text,
    html,
  });
};
