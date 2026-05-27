import asyncHandler from 'express-async-handler';
import { body } from 'express-validator';
import ContactInquiry from '../models/ContactInquiry.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validateRequest } from '../utils/validation.js';
import { sendContactAcknowledgment, sendContactResponse, sendContactNotificationToAdmin } from '../services/contact-email.service.js';
import type { TypedRequest } from '@skillhub/types/src/express.js';
import type { CREATE_CONTACT_INQUIRY, UPDATE_CONTACT_INQUIRY } from '@skillhub/types/src/contact.js';

const createValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
];

export const createContactInquiry = asyncHandler(async (req: TypedRequest<CREATE_CONTACT_INQUIRY>, res: any) => {
  const { name, email, mobile, subject, message } = req.body;

  const inquiry = await ContactInquiry.create({
    name,
    email,
    mobile,
    subject,
    message,
  });

  try {
    await sendContactAcknowledgment(inquiry);
  } catch (emailError) {
    console.error('Failed to send acknowledgment email:', emailError);
  }

  try {
    await sendContactNotificationToAdmin(inquiry);
  } catch (emailError) {
    console.error('Failed to send admin notification email:', emailError);
  }

  successResponse(
    res,
    { inquiry },
    'Thank you for your inquiry. We will get back to you soon!',
    201
  );
});

export const getAllInquiries = asyncHandler(async (req: any, res: any) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const { status, search } = req.query;

  const query: any = {};

  // Handle both uppercase and lowercase status
  if (status && status !== 'all') {
    query.status = status.toUpperCase();
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ];
  }

  const [inquiries, total] = await Promise.all([
    ContactInquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('respondedBy', 'firstName lastName email'),
    ContactInquiry.countDocuments(query),
  ]);

  successResponse(res, {
    inquiries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getInquiryById = asyncHandler(async (req: any, res: any) => {
  const inquiry = await ContactInquiry.findById(req.params.id)
    .populate('respondedBy', 'firstName lastName email');

  if (!inquiry) {
    errorResponse(res, 'Inquiry not found', 404);
    return;
  }

  successResponse(res, { inquiry });
});

const updateValidation = [
  body('status').optional().isIn(['RESOLVED', 'REJECTED']).withMessage('Status must be RESOLVED or REJECTED'),
  body('response').notEmpty().withMessage('Response is required'),
];

export const updateInquiry = asyncHandler(async (req: TypedRequest<UPDATE_CONTACT_INQUIRY>, res: any) => {
  await Promise.all(updateValidation.map(validation => validation.run(req)));

  if (!validateRequest(req, res)) {
    return;
  }

  const { status, response } = req.body;

  const inquiry = await ContactInquiry.findById(req.params.id);

  if (!inquiry) {
    errorResponse(res, 'Inquiry not found', 404);
    return;
  }

  if (status) {
    inquiry.status = status;
  }

  if (response) {
    inquiry.response = response;
    inquiry.respondedBy = req.user?._id;
    inquiry.respondedAt = new Date();
  }

  await inquiry.save();

  try {
    if (inquiry.status !== 'PENDING') {
      await sendContactResponse(inquiry);
    }
  } catch (emailError) {
    console.error('Failed to send response email:', emailError);
  }

  successResponse(res, { inquiry }, `Inquiry marked as ${inquiry.status?.toLowerCase()}`);
});

export const deleteInquiry = asyncHandler(async (req: any, res: any) => {
  const inquiry = await ContactInquiry.findByIdAndDelete(req.params.id);

  if (!inquiry) {
    errorResponse(res, 'Inquiry not found', 404);
    return;
  }

  successResponse(res, null, 'Inquiry deleted successfully');
});

export const getInquiryStats = asyncHandler(async (req: any, res: any) => {
  const [total, pending, resolved, rejected] = await Promise.all([
    ContactInquiry.countDocuments(),
    ContactInquiry.countDocuments({ status: 'PENDING' }),
    ContactInquiry.countDocuments({ status: 'RESOLVED' }),
    ContactInquiry.countDocuments({ status: 'REJECTED' }),
  ]);

  successResponse(res, {
    stats: {
      total,
      pending,
      resolved,
      rejected,
    },
  });
});