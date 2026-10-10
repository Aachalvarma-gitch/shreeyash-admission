import { Router } from 'express';
import { protect, auth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import Application from '../models/Application.model.js';
import User from '../models/User.model.js';
import Role from '../models/Role.model.js';
import Category from '../models/Category.model.js';
import Course from '../models/Course.model.js';
import ContactInquiry from '../models/ContactInquiry.model.js';
import AdmissionType from '../models/AdmissionType.model.js';
import AuditLog from '../models/AuditLog.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { uploadSingleWithErrorHandling } from '../middlewares/upload';
import { allocateSeat, waitlistApplication, getSeatStatus } from '../controllers/seatAllocation.controller.js';

const router = Router();

// All routes require authentication
router.use(protect);
router.use(auth('Admin', 'Super Admin'));

// ==================== STATS ====================
router.get('/stats', asyncHandler(async (req, res: any) => {
  const [
    totalApplications,
    pendingApplications,
    verifiedApplications,
    rejectedApplications,
    totalInquiries,
    pendingInquiries,
    resolvedInquiries,
    totalStudents,
    totalAdmins,
  ] = await Promise.all([
    Application.countDocuments({ isActive: true }),
    Application.countDocuments({ isActive: true, status: 'SUBMITTED' }),
    Application.countDocuments({ isActive: true, status: 'VERIFIED' }),
    Application.countDocuments({ isActive: true, status: 'REJECTED' }),
    ContactInquiry.countDocuments({}),
    ContactInquiry.countDocuments({ status: 'PENDING' }),
    ContactInquiry.countDocuments({ status: 'RESOLVED' }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true }),
  ]);

  // Get student's role
  const studentRole = await Role.findOne({ name: 'Student', isDeleted: false });
  const adminRole = await Role.findOne({ name: 'Admin', isDeleted: false });
  const superAdminRole = await Role.findOne({ name: 'Super Admin', isDeleted: false });

  const [studentCount, adminCount] = await Promise.all([
    studentRole ? User.countDocuments({ isActive: true, role: studentRole._id }) : 0,
    adminRole || superAdminRole 
      ? User.countDocuments({ 
          isActive: true, 
          role: { $in: [adminRole?._id, superAdminRole?._id] }
        }) 
      : 0,
  ]);

  // Recent applications
  const recentApplications = await Application.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'firstName lastName email')
    .populate('primaryCourse', 'name')
    .populate('secondaryCourse', 'name');

  // Monthly applications for chart
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const monthlyStats = await Application.aggregate([
    { $match: { isActive: true, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ['$status', 'VERIFIED'] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  successResponse(res, {
    stats: {
      totalApplications,
      pendingApplications,
      verifiedApplications,
      rejectedApplications,
      totalInquiries,
      pendingInquiries,
      resolvedInquiries,
      totalStudents: studentCount,
      totalAdmins: adminCount,
    },
    monthlyStats: monthlyStats.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      applications: m.count,
      verified: m.verified,
    })),
    recentApplications,
  }, 'Stats retrieved successfully');
}));

// ==================== APPLICATIONS ====================
router.get('/applications', asyncHandler(async (req, res: any) => {
  const { status, page = 1, limit = 20, search } = req.query;
  
  const query: any = { isActive: true };
  
  if (status && status !== 'all') {
    query.status = status;
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { applicationId: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const [applications, total] = await Promise.all([
    Application.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('user', 'firstName lastName email mobile')
      .populate('category', 'name')
      .populate('primaryCourse', 'name code')
      .populate('secondaryCourse', 'name code'),
    Application.countDocuments(query),
  ]);

  successResponse(res, {
    applications,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  }, 'Applications retrieved successfully');
}));

router.get('/applications/:id', asyncHandler(async (req, res: any) => {
  const application = await Application.findById(req.params.id)
    .select('+documents')
    .populate('user', 'firstName lastName email mobile')
    .populate('category', 'name')
    .populate('primaryCourse', 'name code description duration fees')
    .populate('secondaryCourse', 'name code')
    .populate('allocatedCourse', 'name')
    .populate('previousCategory', 'name')
    .populate('category2', 'name')
    .populate('primaryCourse2', 'name code')
    .populate('secondaryCourse2', 'name code');

  if (!application) {
    errorResponse(res, 'Application not found', 404);
    return;
  }

  successResponse(res, { application }, 'Application retrieved successfully');
}));

// Admin: Upload document for an application
router.post('/applications/:id/documents', uploadSingleWithErrorHandling, asyncHandler(async (req: any, res: any) => {
  const { documentType } = req.body;
  const correlationId = uuidv4();
  
  console.log('[Upload] Starting document upload...');
  console.log('[Upload] Document type:', documentType);
  console.log('[Upload] Application ID:', req.params.id);
  console.log('[Upload] File received:', req.file ? 'YES' : 'NO');
  
  if (!req.file) {
    console.log('[Upload] ERROR: No file uploaded');
    errorResponse(res, 'No file uploaded', 400);
    return;
  }
  
  console.log('[Upload] File details:', {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
  
  const validTypes = ['tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'jee_result', 'photo'];
  if (!validTypes.includes(documentType)) {
    console.log('[Upload] ERROR: Invalid document type:', documentType);
    errorResponse(res, 'Invalid document type', 400);
    return;
  }
  
  try {
    console.log('[Upload] Uploading to Cloudinary...');
    const uploadResult = await uploadToCloudinary(
      req.file,
      'skillhub',
      correlationId,
      req.user?._id?.toString(),
      req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
    );
    
    console.log('[Upload] Cloudinary upload successful:', {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
    });
    
    const application = await Application.findById(req.params.id);
    if (!application) {
      console.log('[Upload] ERROR: Application not found:', req.params.id);
      errorResponse(res, 'Application not found', 404);
      return;
    }
    
    console.log('[Upload] Application found. Current documents:', application.documents?.length || 0);
    
    const existingIndex = application.documents.findIndex((d: any) => d.type === documentType);
    if (existingIndex >= 0) {
      console.log('[Upload] Replacing existing document at index:', existingIndex);
      application.documents[existingIndex] = {
        type: documentType,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedAt: new Date(),
      };
    } else {
      console.log('[Upload] Adding new document');
      application.documents.push({
        type: documentType,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedAt: new Date(),
      });
    }
    
    await application.save();
    console.log('[Upload] Document saved to database. Total documents:', application.documents.length);
    
    successResponse(res, { 
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      type: documentType 
    }, 'Document uploaded successfully');
  } catch (error: any) {
    console.log('[Upload] ERROR:', error.message);
    console.error('[Upload] Full error:', error);
    errorResponse(res, 'Failed to upload document', 500);
  }
}));

router.put('/applications/:id/status', asyncHandler(async (req, res: any) => {
  const { status, reviewNotes, rejectedReason } = req.body;
  
  const validStatuses = [
    'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED',
    'REVISION_REQUESTED', 'MERIT_LIST', 'SEAT_ALLOCATED',
    'FEE_PAID', 'ADMISSION_CONFIRMED'
  ];
  
  if (!validStatuses.includes(status)) {
    errorResponse(res, 'Invalid status', 400);
    return;
  }

  const application = await Application.findById(req.params.id);
  
  if (!application) {
    errorResponse(res, 'Application not found', 404);
    return;
  }

  const oldStatus = application.status;
  application.status = status;
  application.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: req.user._id,
    reason: rejectedReason,
  });

  if (reviewNotes) {
    application.reviewNotes = reviewNotes;
  }
  if (rejectedReason) {
    application.rejectedReason = rejectedReason;
  }

  await application.save();
  
  // Create audit log
  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'application',
    resourceId: application._id,
    details: { oldStatus, newStatus: status, notes: reviewNotes },
    ipAddress: req.ip,
  });
  
  const populated = await Application.findById(req.params.id)
    .populate('user', 'firstName lastName email')
    .populate('primaryCourse', 'name')
    .populate('secondaryCourse', 'name');

  successResponse(res, { application: populated }, 'Application status updated successfully');
}));

// Bulk status update
router.put('/applications/bulk-status', asyncHandler(async (req, res: any) => {
  const { applicationIds, status, reviewNotes } = req.body;
  
  if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
    errorResponse(res, 'Application IDs required', 400);
    return;
  }

  const validStatuses = [
    'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED',
    'REVISION_REQUESTED', 'MERIT_LIST', 'SEAT_ALLOCATED',
    'FEE_PAID', 'ADMISSION_CONFIRMED'
  ];
  
  if (!validStatuses.includes(status)) {
    errorResponse(res, 'Invalid status', 400);
    return;
  }

  const result = await Application.updateMany(
    { _id: { $in: applicationIds } },
    {
      $set: { status },
      $push: {
        statusHistory: {
          status,
          changedAt: new Date(),
          changedBy: req.user._id,
        },
      },
    }
  );

  // Create audit log for bulk action
  await AuditLog.create({
    user: req.user._id,
    action: 'BULK_UPDATE',
    resource: 'application',
    resourceId: null,
    details: { applicationIds, newStatus: status, count: result.modifiedCount },
    ipAddress: req.ip,
  });

  successResponse(res, { updated: result.modifiedCount }, 'Applications updated successfully');
}));

// ==================== SEAT ALLOCATION ====================
router.post('/applications/:id/allocate', asyncHandler(allocateSeat));
router.post('/applications/:id/waitlist', asyncHandler(waitlistApplication));
router.get('/courses/seat-status', asyncHandler(getSeatStatus));

// ==================== STUDENTS ====================
router.get('/students', asyncHandler(async (req, res: any) => {
  const studentRole = await Role.findOne({ name: 'Student', isDeleted: false });
  if (!studentRole) {
    errorResponse(res, 'Student role not found', 404);
    return;
  }

  const { page = 1, limit = 20, search } = req.query;
  
  const query: any = { isActive: true, role: studentRole._id };
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const [students, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('role', 'name'),
    User.countDocuments(query),
  ]);

  // Get application status for each student
  const studentIds = students.map(s => s._id);
  const applications = await Application.find({ user: { $in: studentIds }, isActive: true })
    .populate('primaryCourse', 'name')
    .populate('status');

  const studentsWithApps = students.map(student => {
    const app = applications.find(a => a.user?.toString() === student._id.toString());
    return {
      ...student.toObject(),
      application: app ? {
        applicationId: app.applicationId,
        status: app.status,
        course: app.primaryCourse?.name,
      } : null,
    };
  });

  successResponse(res, {
    students: studentsWithApps,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  }, 'Students retrieved successfully');
}));

// ==================== INQUIRIES ====================
router.get('/inquiries', asyncHandler(async (req, res: any) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const query: any = {};
  
  if (status && status !== 'all') {
    query.status = status.toUpperCase();
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const [inquiries, total] = await Promise.all([
    ContactInquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string)),
    ContactInquiry.countDocuments(query),
  ]);

  successResponse(res, {
    inquiries,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  }, 'Inquiries retrieved successfully');
}));

router.put('/inquiries/:id', asyncHandler(async (req, res: any) => {
  const { status } = req.body;
  
  const inquiry = await ContactInquiry.findByIdAndUpdate(
    req.params.id,
    { status: status || 'read' },
    { new: true }
  );

  if (!inquiry) {
    errorResponse(res, 'Inquiry not found', 404);
    return;
  }

  // Create audit log
  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'inquiry',
    resourceId: inquiry._id,
    details: { newStatus: status },
    ipAddress: req.ip,
  });

  successResponse(res, { inquiry }, 'Inquiry updated successfully');
}));

// ==================== USERS ====================
router.get('/users', asyncHandler(async (req, res: any) => {
  const { role, page = 1, limit = 20, search } = req.query;
  
  const query: any = { isActive: true };
  
  if (role) {
    const roleDoc = await Role.findOne({ name: role, isDeleted: false });
    if (roleDoc) {
      query.role = roleDoc._id;
    }
  }
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('role', 'name'),
    User.countDocuments(query),
  ]);

  successResponse(res, {
    users,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  }, 'Users retrieved successfully');
}));

router.post('/users', asyncHandler(async (req, res: any) => {
  const { email, password, firstName, lastName, mobile, role } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    errorResponse(res, 'User with this email already exists', 400);
    return;
  }

  // Get role
  const roleDoc = await Role.findOne({ name: role || 'Admin', isDeleted: false });
  if (!roleDoc) {
    errorResponse(res, 'Role not found', 400);
    return;
  }

  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    mobile,
    role: roleDoc._id,
  });

  // Create audit log
  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'user',
    resourceId: user._id,
    details: { email, role },
    ipAddress: req.ip,
  });

  successResponse(res, { user: { ...user.toObject(), password: undefined } }, 'User created successfully', 201);
}));

router.delete('/users/:id', asyncHandler(async (req, res: any) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  // Prevent self-deletion
  if (user._id.toString() === req.user._id.toString()) {
    errorResponse(res, 'Cannot delete yourself', 400);
    return;
  }

  user.isActive = false;
  await user.save();

  // Create audit log
  await AuditLog.create({
    user: req.user._id,
    action: 'DELETE',
    resource: 'user',
    resourceId: user._id,
    details: { email: user.email },
    ipAddress: req.ip,
  });

  successResponse(res, null, 'User deactivated successfully');
}));

router.put('/users/:id/toggle-block', asyncHandler(async (req, res: any) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  if (user._id.toString() === req.user._id.toString()) {
    errorResponse(res, 'Cannot block yourself', 400);
    return;
  }

  user.isBlocked = !user.isBlocked;
  await user.save();

  await AuditLog.create({
    user: req.user._id,
    action: user.isBlocked ? 'BLOCK' : 'UNBLOCK',
    resource: 'user',
    resourceId: user._id,
    details: { email: user.email, blocked: user.isBlocked },
    ipAddress: req.ip,
  });

  successResponse(res, { user: { _id: user._id, email: user.email, isBlocked: user.isBlocked } }, 
    user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully');
}));

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', asyncHandler(async (req, res: any) => {
  const { resource, action, page = 1, limit = 50 } = req.query;
  
  const query: any = {};
  
  if (resource) query.resource = resource;
  if (action) query.action = action;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('user', 'firstName lastName email')
      .populate('resourceId'),
    AuditLog.countDocuments(query),
  ]);

  successResponse(res, {
    logs,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  }, 'Audit logs retrieved successfully');
}));

// ==================== EXPORT ====================
router.get('/export/applications', asyncHandler(async (req, res: any) => {
  const { format = 'csv', status } = req.query;
  
  const query: any = { isActive: true };
  if (status && status !== 'all') {
    query.status = status;
  }

  const applications = await Application.find(query)
    .populate('user', 'firstName lastName email mobile')
    .populate('primaryCourse', 'name code')
    .populate('secondaryCourse', 'name code')
    .populate('category', 'name');

  const data = applications.map(app => ({
    'Application ID': app.applicationId,
    'Name': app.name,
    'Email': app.email,
    'Address': app.address,
    '10th Marks': app.tenthMarks,
    '12th Marks': app.twelfthMarks,
    'CET Score': app.cetScore,
    'JEE Score': app.jeeScore || '',
    'Primary Course': app.primaryCourse?.name || '',
    'Secondary Course': app.secondaryCourse?.name || '',
    'Status': app.status,
    'Submitted Date': app.submittedAt ? new Date(app.submittedAt).toISOString() : '',
    'Created Date': app.createdAt ? new Date(app.createdAt).toISOString() : '',
  }));

  if (format === 'json') {
    successResponse(res, { data }, 'Applications exported successfully');
  } else {
    // CSV format
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map((row: any) => Object.values(row).map((val: any) => 
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(','));
    const csv = [headers, ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=applications-${Date.now()}.csv`);
    res.send(csv);
  }
}));

router.get('/export/inquiries', asyncHandler(async (req, res: any) => {
  const { format = 'csv', status } = req.query;
  
  const query: any = { isDeleted: false };
  if (status && status !== 'all') {
    query.status = status;
  }

  const inquiries = await ContactInquiry.find(query).sort({ createdAt: -1 });

  const data = inquiries.map(inq => ({
    'Name': inq.name,
    'Email': inq.email,
    'Mobile': inq.mobile || '',
    'Message': inq.message,
    'Status': inq.status,
    'Date': inq.createdAt ? new Date(inq.createdAt).toISOString() : '',
  }));

  if (format === 'json') {
    successResponse(res, { data }, 'Inquiries exported successfully');
  } else {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map((row: any) => Object.values(row).map((val: any) => 
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(','));
    const csv = [headers, ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inquiries-${Date.now()}.csv`);
    res.send(csv);
  }
}));

// ==================== PROFILE ====================
router.get('/profile', asyncHandler(async (req, res: any) => {
  const user = await User.findById(req.user._id).select('-password').populate('role', 'name');
  successResponse(res, { user }, 'Profile retrieved successfully');
}));

router.put('/profile', asyncHandler(async (req, res: any) => {
  const { firstName, lastName, mobile } = req.body;
  
  const user = await User.findById(req.user._id);
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (mobile) user.mobile = mobile;
  
  await user.save();
  
  const populated = await User.findById(req.user._id).select('-password').populate('role', 'name');
  successResponse(res, { user: populated }, 'Profile updated successfully');
}));

router.put('/change-password', asyncHandler(async (req, res: any) => {
  const { currentPassword, newPassword } = req.body;
  
  const user = await User.findById(req.user._id);
  
  // Check if user has password (not social login)
  if (user.password) {
    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.default.compare(currentPassword, user.password);
    if (!isMatch) {
      errorResponse(res, 'Current password is incorrect', 400);
      return;
    }
  }
  
  user.password = newPassword;
  await user.save();

// Create audit log
  await AuditLog.create({
    user: req.user._id,
    action: 'PASSWORD_CHANGE',
    resource: 'user',
    resourceId: user._id,
    details: {},
    ipAddress: req.ip,
  });

  successResponse(res, null, 'Password changed successfully');
}));

// ==================== SEED DATA ====================
router.post('/seed-data', asyncHandler(async (req, res: any) => {
  // Check if data already exists
  const existingCategories = await Category.countDocuments();
  if (existingCategories > 0) {
    errorResponse(res, 'Seed data already exists. Clear database first.', 400);
    return;
  }

  // Create Categories
  const categories = await Category.insertMany([
    { name: 'Computer/IT', description: 'Information Technology and Computer Science courses', displayOrder: 1, isActive: true },
    { name: 'Engineering', description: 'Various engineering disciplines', displayOrder: 2, isActive: true },
    { name: 'Commerce/Business', description: 'Commerce and Business administration', displayOrder: 3, isActive: true },
    { name: 'Arts & Humanities', description: 'Arts and Humanities programs', displayOrder: 4, isActive: true },
    { name: 'Medical & Healthcare', description: 'Medical and Healthcare courses', displayOrder: 5, isActive: true },
    { name: 'Nursing', description: 'Nursing and healthcare assistant programs', displayOrder: 6, isActive: true },
  ]);

  // Create Courses
  const courses = await Course.insertMany([
    // Computer/IT
    { name: 'Bachelor of Computer Applications', code: 'BCA', description: '3-year undergraduate IT program', duration: '3 years', fees: 150000, category: categories[0]._id, isActive: true },
    { name: 'Master of Computer Applications', code: 'MCA', description: '2-year postgraduate IT program', duration: '2 years', fees: 200000, category: categories[0]._id, isActive: true },
    { name: 'B.Sc. IT', code: 'BSCIT', description: 'Information Technology', duration: '3 years', fees: 120000, category: categories[0]._id, isActive: true },
    { name: 'Diploma in Web Development', code: 'DWD', description: '6-month web development course', duration: '6 months', fees: 50000, category: categories[0]._id, isActive: true },
    { name: 'Data Science with Python', code: 'DSP', description: 'Data Science training', duration: '3 months', fees: 40000, category: categories[0]._id, isActive: true },
    
    // Engineering
    { name: 'B.E. Computer Engineering', code: 'BECSE', description: 'Computer Engineering', duration: '4 years', fees: 400000, category: categories[1]._id, isActive: true },
    { name: 'B.E. Mechanical Engineering', code: 'BEME', description: 'Mechanical Engineering', duration: '4 years', fees: 350000, category: categories[1]._id, isActive: true },
    { name: 'B.E. Civil Engineering', code: 'BECE', description: 'Civil Engineering', duration: '4 years', fees: 350000, category: categories[1]._id, isActive: true },
    { name: 'B.E. Electronics & Telecom', code: 'BEETC', description: 'Electronics and Telecommunications', duration: '4 years', fees: 380000, category: categories[1]._id, isActive: true },
    { name: 'M.Tech Computer Science', code: 'MTCSE', description: 'M.Tech in CSE', duration: '2 years', fees: 250000, category: categories[1]._id, isActive: true },
    
    // Commerce/Business
    { name: 'Bachelor of Commerce', code: 'BCOM', description: 'General Commerce', duration: '3 years', fees: 90000, category: categories[2]._id, isActive: true },
    { name: 'Bachelor of Business Administration', code: 'BBA', description: 'Business Administration', duration: '3 years', fees: 180000, category: categories[2]._id, isActive: true },
    { name: 'Master of Commerce', code: 'MCOM', description: 'Postgraduate Commerce', duration: '2 years', fees: 100000, category: categories[2]._id, isActive: true },
    { name: 'MBA Finance', code: 'MBAFIN', description: 'Finance Specialization', duration: '2 years', fees: 400000, category: categories[2]._id, isActive: true },
    { name: 'Chartered Accountancy', code: 'CA', description: 'Chartered Accountancy', duration: '5 years', fees: 500000, category: categories[2]._id, isActive: true },
    
    // Arts & Humanities
    { name: 'Bachelor of Arts', code: 'BA', description: 'General Arts', duration: '3 years', fees: 60000, category: categories[3]._id, isActive: true },
    { name: 'Bachelor of Arts (Psychology)', code: 'BAPSY', description: 'Psychology', duration: '3 years', fees: 70000, category: categories[3]._id, isActive: true },
    { name: 'Bachelor of Arts (English)', code: 'BAENG', description: 'English Literature', duration: '3 years', fees: 60000, category: categories[3]._id, isActive: true },
    { name: 'Master of Arts', code: 'MA', description: 'Postgraduate Arts', duration: '2 years', fees: 80000, category: categories[3]._id, isActive: true },
    
    // Medical & Healthcare
    { name: 'MBBS', code: 'MBBS', description: 'Bachelor of Medicine and Surgery', duration: '5.5 years', fees: 2500000, category: categories[4]._id, isActive: true },
    { name: 'B.Sc. Medical Lab Technology', code: 'BSMLT', description: 'Medical Lab Technology', duration: '3 years', fees: 200000, category: categories[4]._id, isActive: true },
    { name: 'B.Pharma', code: 'BPHAR', description: 'Bachelor of Pharmacy', duration: '4 years', fees: 350000, category: categories[4]._id, isActive: true },
    { name: 'M.D.', code: 'MD', description: 'Doctor of Medicine', duration: '3 years', fees: 1500000, category: categories[4]._id, isActive: true },
    
    // Nursing
    { name: 'B.Sc. Nursing', code: 'BSCN', description: 'Bachelor of Nursing', duration: '4 years', fees: 400000, category: categories[5]._id, isActive: true },
    { name: 'General Nursing & Midwifery', code: 'GNM', description: 'GNM Course', duration: '3 years', fees: 300000, category: categories[5]._id, isActive: true },
    { name: 'ANM', code: 'ANM', description: 'Auxiliary Nurse Midwife', duration: '2 years', fees: 150000, category: categories[5]._id, isActive: true },
  ]);

  // Create sample inquiries
  const inquiries = await ContactInquiry.insertMany([
    { name: 'Rahul Sharma', email: 'rahul@example.com', mobile: '9876543210', subject: 'Admission Inquiry', message: 'What is the eligibility for BCA course?', status: 'PENDING' },
    { name: 'Priya Patel', email: 'priya@example.com', mobile: '9876543211', subject: 'Fee Structure', message: 'What is the total fee for B.Sc. Nursing?', status: 'PENDING' },
    { name: 'Amit Kumar', email: 'amit@example.com', mobile: '9876543212', subject: 'Hostel Facility', message: 'Do you provide hostel facility for outstation students?', status: 'READ' },
    { name: 'Sneha Gupta', email: 'sneha@example.com', mobile: '9876543213', subject: 'Course Details', message: 'What is the duration of MCA course?', status: 'READ' },
    { name: 'Vikram Singh', email: 'vikram@example.com', mobile: '9876543214', subject: 'Placement Assistance', message: 'Do you provide placement assistance after course completion?', status: 'RESOLVED' },
    { name: 'Anjali Desai', email: 'anjali@example.com', mobile: '9876543215', subject: ' scholarship', message: 'Are there any scholarships available for meritorious students?', status: 'RESOLVED' },
    { name: 'Raj Malhotra', email: 'raj@example.com', mobile: '9876543216', subject: 'Entrance Exam', message: 'Is there any entrance exam for B.E. course?', status: 'PENDING' },
    { name: 'Meera Shah', email: 'meera@example.com', mobile: '9876543217', subject: 'Online Classes', message: 'Do you offer online classes for working professionals?', status: 'READ' },
    { name: 'Karan Joshi', email: 'karan@example.com', mobile: '9876543218', subject: 'Distance Learning', message: 'Do you have distance learning program for B.Com?', status: 'PENDING' },
    { name: 'Pooja Nair', email: 'pooja@example.com', mobile: '9876543219', subject: 'International Students', message: 'Do you accept international students for MBBS?', status: 'PENDING' },
  ]);

  // Create student users with applications
  const studentRole = await Role.findOne({ name: 'Student', isDeleted: false });

  if (studentRole) {
    const studentData = [
      { firstName: 'Rahul', lastName: 'Sharma', email: 'seed.rahul@example.com', mobile: '9876543001' },
      { firstName: 'Priya', lastName: 'Patel', email: 'seed.priya@example.com', mobile: '9876543002' },
      { firstName: 'Amit', lastName: 'Kumar', email: 'seed.amit@example.com', mobile: '9876543003' },
      { firstName: 'Sneha', lastName: 'Joshi', email: 'seed.sneha@example.com', mobile: '9876543004' },
      { firstName: 'Raj', lastName: 'Malhotra', email: 'seed.raj@example.com', mobile: '9876543005' },
      { firstName: 'Anjali', lastName: 'Singh', email: 'seed.anjali@example.com', mobile: '9876543006' },
      { firstName: 'Vikram', lastName: 'Reddy', email: 'seed.vikram@example.com', mobile: '9876543007' },
      { firstName: 'Neha', lastName: 'Agarwal', email: 'seed.neha@example.com', mobile: '9876543008' },
      { firstName: 'Karan', lastName: 'Shah', email: 'seed.karan@example.com', mobile: '9876543009' },
      { firstName: 'Divya', lastName: 'Menon', email: 'seed.divya@example.com', mobile: '9876543010' },
      { firstName: 'Rohan', lastName: 'Mehta', email: 'seed.rohan@example.com', mobile: '9876543011' },
      { firstName: 'Shweta', lastName: 'Rao', email: 'seed.shweta@example.com', mobile: '9876543012' },
      { firstName: 'Ajay', lastName: 'Verma', email: 'seed.ajay@example.com', mobile: '9876543013' },
      { firstName: 'Pooja', lastName: 'Iyer', email: 'seed.pooja@example.com', mobile: '9876543014' },
      { firstName: 'Deepak', lastName: 'Chopra', email: 'seed.deepak@example.com', mobile: '9876543015' },
      { firstName: 'Sanjay', lastName: 'Nair', email: 'seed.sanjay@example.com', mobile: '9876543016' },
      { firstName: 'Megha', lastName: 'Pandey', email: 'seed.megha@example.com', mobile: '9876543017' },
      { firstName: 'Kavita', lastName: 'Desai', email: 'seed.kavita@example.com', mobile: '9876543018' },
      { firstName: 'Suresh', lastName: 'Bhatia', email: 'seed.suresh@example.com', mobile: '9876543019' },
      { firstName: 'Lakshmi', lastName: 'Pillai', email: 'seed.lakshmi@example.com', mobile: '9876543020' },
      { firstName: 'Gopal', lastName: 'Srinivasan', email: 'seed.gopal@example.com', mobile: '9876543021' },
    ];

    const appStatuses = [
      'SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'UNDER_REVIEW',
      'VERIFIED', 'REJECTED', 'MERIT_LIST', 'DRAFT',
      'SUBMITTED', 'UNDER_REVIEW', 'SEAT_ALLOCATED', 'ADMISSION_CONFIRMED',
      'REJECTED', 'SUBMITTED', 'MERIT_LIST',
      'UNDER_REVIEW', 'VERIFIED', 'SUBMITTED', 'SUBMITTED', 'REJECTED', 'MERIT_LIST',
    ];

    const admissionTypes = [
      'POLYTECHNIC', 'ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA',
      'DIRECT_SECOND_YEAR_FE', 'COLLEGE_TRANSFER', 'BRANCH_CHANGE',
      'ENGINEERING_FIRST_YEAR',
      'POLYTECHNIC', 'ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA',
      'DIRECT_SECOND_YEAR_FE', 'COLLEGE_TRANSFER', 'BRANCH_CHANGE',
      'POLYTECHNIC', 'ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA',
      'DIRECT_SECOND_YEAR_FE', 'COLLEGE_TRANSFER', 'BRANCH_CHANGE',
      'ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_FE',
    ];

    let appsCreated = 0;

    for (let i = 0; i < studentData.length; i++) {
      const s = studentData[i];

      // Create student user (skip if already exists)
      let studentUser = await User.findOne({ email: s.email });
      if (!studentUser) {
        studentUser = await User.create({
          email: s.email,
          mobile: s.mobile,
          password: 'Test@123',
          firstName: s.firstName,
          lastName: s.lastName,
          role: studentRole._id,
          isActive: true,
        });
      }

      const existingApp = await Application.findOne({ user: studentUser._id });
      if (existingApp) continue;

      const status = appStatuses[i];
      const admissionType = admissionTypes[i];
      const catIndex = i % categories.length;
      const categoryId = categories[catIndex]._id;
      const coursesInCat = courses.filter((c: any) => c.category.toString() === categoryId.toString());
      if (coursesInCat.length === 0) continue;
      const primaryCourse = coursesInCat[i % coursesInCat.length];
      const diffCatIndex = (catIndex + 1) % categories.length;
      const coursesInDiffCat = courses.filter((c: any) => c.category.toString() === categories[diffCatIndex]._id.toString());
      const secondaryCourse = coursesInDiffCat.length > 0 ? coursesInDiffCat[i % coursesInDiffCat.length] : undefined;

      const appData: any = {
        user: studentUser._id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        address: `${i + 1}, ${['MG Road', 'Station Road', 'College Road', 'Park Avenue', 'Main Street'][i % 5]}, ${['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik'][i % 5]} ${400000 + i * 1000}`,
        tenthMarks: 65 + Math.floor(Math.random() * 30),
        admissionType,
        category: categoryId,
        primaryCourse: primaryCourse._id,
        secondaryCourse: secondaryCourse ? secondaryCourse._id : undefined,
        documents: [],
        status,
        submittedAt: status !== 'DRAFT' ? new Date(Date.now() - (i * 3 * 24 * 60 * 60 * 1000)) : undefined,
        statusHistory: [
          { status: 'DRAFT', changedAt: new Date(Date.now() - (i * 3 + 5) * 24 * 60 * 60 * 1000), changedBy: studentUser._id },
          ...(status !== 'DRAFT' ? [{ status, changedAt: new Date(Date.now() - (i * 3) * 24 * 60 * 60 * 1000), changedBy: studentUser._id }] : []),
        ],
        createdBy: studentUser._id,
        updatedBy: studentUser._id,
      };

      switch (admissionType) {
        case 'POLYTECHNIC':
          appData.documents.push(
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
            { type: 'leaving_certificate', url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
            { type: 'photo', url: 'https://res.cloudinary.com/sample/photo.jpg', publicId: 'sample_photo', uploadedAt: new Date() },
            { type: 'aadhaar_card', url: 'https://res.cloudinary.com/sample/aadhaar.pdf', publicId: 'sample_aadhaar', uploadedAt: new Date() },
          );
          break;

        case 'ENGINEERING_FIRST_YEAR':
          appData.twelfthMarks = 60 + Math.floor(Math.random() * 35);
          appData.cetScore = 50 + Math.floor(Math.random() * 150);
          appData.jeeScore = Math.random() > 0.4 ? Math.floor(Math.random() * 200) : undefined;
          appData.documents.push(
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
            { type: 'twelfth_marksheet', url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'cet_result', url: 'https://res.cloudinary.com/sample/cet_result.pdf', publicId: 'sample_cet', uploadedAt: new Date() },
            { type: 'leaving_certificate', url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
            { type: 'photo', url: 'https://res.cloudinary.com/sample/photo.jpg', publicId: 'sample_photo', uploadedAt: new Date() },
            { type: 'aadhaar_card', url: 'https://res.cloudinary.com/sample/aadhaar.pdf', publicId: 'sample_aadhaar', uploadedAt: new Date() },
          );
          break;

        case 'DIRECT_SECOND_YEAR_DIPLOMA':
          appData.diplomaCollege = ['Government Polytechnic Mumbai', 'VJTI Polytechnic', 'K J Somaiya Polytechnic', 'Pune Polytechnic'][i % 4];
          appData.diplomaCgpa = parseFloat((Math.random() * 3 + 6).toFixed(2));
          appData.diplomaPercentage = 60 + Math.floor(Math.random() * 35);
          appData.diplomaYearOfPassing = 2025;
          appData.documents.push(
            { type: 'diploma_marksheet', url: 'https://res.cloudinary.com/sample/diploma_marksheet.pdf', publicId: 'sample_diploma_ms', uploadedAt: new Date() },
            { type: 'diploma_certificate', url: 'https://res.cloudinary.com/sample/diploma_cert.pdf', publicId: 'sample_diploma_cert', uploadedAt: new Date() },
            { type: 'migration_certificate', url: 'https://res.cloudinary.com/sample/migration_cert.pdf', publicId: 'sample_migration', uploadedAt: new Date() },
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
          );
          break;

        case 'DIRECT_SECOND_YEAR_FE':
          appData.twelfthMarks = 60 + Math.floor(Math.random() * 35);
          appData.cetScore = 50 + Math.floor(Math.random() * 150);
          appData.jeeScore = Math.random() > 0.4 ? Math.floor(Math.random() * 200) : undefined;
          appData.previousCollegeName = ['Pune Institute of Technology', 'Mumbai University', 'Bharti Vidyapeeth', 'MIT WPU', 'DY Patil College'][i % 5];
          appData.previousCollegeAddress = ['Pune, Maharashtra', 'Mumbai, Maharashtra', 'Kolhapur, Maharashtra'][i % 3];
          {
            const uniqueCats = categories.reduce((acc: any[], c: any) => {
              if (c._id.toString() !== categoryId.toString()) acc.push(c);
              return acc;
            }, []);
            if (uniqueCats.length > 0) appData.previousCategory = uniqueCats[i % uniqueCats.length]._id;
          }
          appData.documents.push(
            { type: 'first_year_marksheet', url: 'https://res.cloudinary.com/sample/first_year_ms.pdf', publicId: 'sample_fy_ms', uploadedAt: new Date() },
            { type: 'previous_college_bonafide', url: 'https://res.cloudinary.com/sample/bonafide.pdf', publicId: 'sample_bonafide', uploadedAt: new Date() },
            { type: 'leaving_certificate', url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
            { type: 'twelfth_marksheet', url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
          );
          break;

        case 'COLLEGE_TRANSFER':
          appData.twelfthMarks = 55 + Math.floor(Math.random() * 35);
          appData.transferType = 'TRANSFER';
          appData.previousCollegeName = ['Pune Institute of Technology', 'Mumbai University', 'Bharti Vidyapeeth', 'MIT WPU', 'DY Patil College'][i % 5];
          appData.previousCollegeAddress = ['Pune, Maharashtra', 'Mumbai, Maharashtra', 'Nashik, Maharashtra'][i % 3];
          appData.documents.push(
            { type: 'twelfth_marksheet', url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'previous_college_bonafide', url: 'https://res.cloudinary.com/sample/bonafide.pdf', publicId: 'sample_bonafide', uploadedAt: new Date() },
            { type: 'previous_year_marksheet', url: 'https://res.cloudinary.com/sample/prev_year_ms.pdf', publicId: 'sample_prev_ms', uploadedAt: new Date() },
            { type: 'transfer_certificate', url: 'https://res.cloudinary.com/sample/transfer_cert.pdf', publicId: 'sample_transfer', uploadedAt: new Date() },
            { type: 'leaving_certificate', url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          );
          break;

        case 'BRANCH_CHANGE':
          appData.twelfthMarks = 60 + Math.floor(Math.random() * 30);
          appData.cetScore = 80 + Math.floor(Math.random() * 100);
          appData.transferType = 'BRANCH_CHANGE';
          appData.previousCollegeName = 'Sandip University';
          appData.previousCollegeAddress = 'Nashik, Maharashtra';
          appData.documents.push(
            { type: 'twelfth_marksheet', url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'previous_year_marksheet', url: 'https://res.cloudinary.com/sample/prev_year_ms.pdf', publicId: 'sample_prev_ms', uploadedAt: new Date() },
            { type: 'fee_receipt', url: 'https://res.cloudinary.com/sample/fee_receipt.pdf', publicId: 'sample_fee', uploadedAt: new Date() },
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
          );
          break;
      }

      await Application.create(appData);
      appsCreated++;
    }
  }

  successResponse(res, {
    categories: categories.length,
    courses: courses.length,
    inquiries: inquiries.length,
  }, `Seed data created: ${categories.length} categories, ${courses.length} courses, ${inquiries.length} inquiries. Visit Applications page to view student applications.`);
}));

// ==================== ADMISSION TYPES ====================
router.get('/admission-types', asyncHandler(async (req, res: any) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [types, total] = await Promise.all([
    AdmissionType.find({})
      .sort({ displayOrder: 1 })
      .skip(skip)
      .limit(parseInt(limit as string)),
    AdmissionType.countDocuments({}),
  ]);

  successResponse(res, {
    admissionTypes: types,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  }, 'Admission types retrieved successfully');
}));

router.get('/admission-types/:id', asyncHandler(async (req, res: any) => {
  const type = await AdmissionType.findById(req.params.id);
  if (!type) {
    errorResponse(res, 'Admission type not found', 404);
    return;
  }
  successResponse(res, { admissionType: type }, 'Admission type retrieved successfully');
}));

router.post('/admission-types', asyncHandler(async (req, res: any) => {
  const { name, slug, description, requiredDocuments, optionalDocuments, fee, displayOrder } = req.body;

  const existing = await AdmissionType.findOne({ slug });
  if (existing) {
    errorResponse(res, 'Admission type with this slug already exists', 400);
    return;
  }

  const type = await AdmissionType.create({
    name, slug, description,
    requiredDocuments: requiredDocuments || [],
    optionalDocuments: optionalDocuments || [],
    fee: fee || 0,
    displayOrder: displayOrder || 0,
  });

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'admission_type',
    resourceId: type._id,
    details: { name, slug },
    ipAddress: req.ip,
  });

  successResponse(res, { admissionType: type }, 'Admission type created successfully', 201);
}));

router.put('/admission-types/:id', asyncHandler(async (req, res: any) => {
  const { name, slug, description, requiredDocuments, optionalDocuments, fee, displayOrder, isActive } = req.body;

  const type = await AdmissionType.findById(req.params.id);
  if (!type) {
    errorResponse(res, 'Admission type not found', 404);
    return;
  }

  if (slug && slug !== type.slug) {
    const existing = await AdmissionType.findOne({ slug, _id: { $ne: type._id } });
    if (existing) {
      errorResponse(res, 'Admission type with this slug already exists', 400);
      return;
    }
  }

  if (name) type.name = name;
  if (slug) type.slug = slug;
  if (description !== undefined) type.description = description;
  if (requiredDocuments) type.requiredDocuments = requiredDocuments;
  if (optionalDocuments) type.optionalDocuments = optionalDocuments;
  if (fee !== undefined) type.fee = fee;
  if (displayOrder !== undefined) type.displayOrder = displayOrder;
  if (isActive !== undefined) type.isActive = isActive;

  await type.save();

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'admission_type',
    resourceId: type._id,
    details: { name, slug },
    ipAddress: req.ip,
  });

  successResponse(res, { admissionType: type }, 'Admission type updated successfully');
}));

router.delete('/admission-types/:id', asyncHandler(async (req, res: any) => {
  const type = await AdmissionType.findById(req.params.id);
  if (!type) {
    errorResponse(res, 'Admission type not found', 404);
    return;
  }

  type.isActive = false;
  await type.save();

  await AuditLog.create({
    user: req.user._id,
    action: 'DELETE',
    resource: 'admission_type',
    resourceId: type._id,
    details: { name: type.name, slug: type.slug },
    ipAddress: req.ip,
  });

  successResponse(res, null, 'Admission type deactivated successfully');
}));

export default router;