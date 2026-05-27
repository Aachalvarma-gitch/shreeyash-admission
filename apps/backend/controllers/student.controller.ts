import asyncHandler from "express-async-handler";
import type { Request } from "express";
import type { TypedRequest, AuthRequest } from "@skillhub/types/src/express";
import User from "../models/User.model.js";
import Application from "../models/Application.model.js";
import AdmissionType from "../models/AdmissionType.model.js";
import Category from "../models/Category.model.js";
import Course from "../models/Course.model.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { ADMISSION_TYPE_DOMAINS } from "../config/admissionTypeCategories.js";
import { StepLogger } from "../utils/stepLogger.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../services/cloudinary.service.js";
import type {
  UPDATE_PROFILE_REQUEST,
  CREATE_APPLICATION_REQUEST,
  UPDATE_APPLICATION_REQUEST,
  GET_COURSES_REQUEST,
} from "@skillhub/types/src/user";

export const getProfile = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-student-profile", correlationId, req.user?._id?.toString());
  try {
    stepLogger.step("authentication-check-started");
    if (!req.user) {
      stepLogger.fail(new Error("Not authenticated"), { reason: "not_authenticated" });
      errorResponse(res, "Not authenticated", 401);
      return;
    }
    stepLogger.step("authentication-check-completed", { userId: req.user._id.toString(), authenticated: true });
    stepLogger.step("profile-retrieval-started", { userId: req.user._id.toString() });
    await req.user.populate("role");
    stepLogger.step("profile-retrieval-completed", { profileRetrieved: true, userId: req.user._id.toString() });
    stepLogger.complete({ userId: req.user._id.toString(), profileRetrieved: true });
    successResponse(res, { user: req.user }, "Profile retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "get-student-profile", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const updateProfile = asyncHandler(async (req: TypedRequest<UPDATE_PROFILE_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("update-student-profile", correlationId, req.user?._id?.toString());
  try {
    stepLogger.step("validation-started", {
      firstName: req.body.firstName ? "[PRESENT]" : "[MISSING]",
      lastName: req.body.lastName ? "[PRESENT]" : "[MISSING]",
      mobile: req.body.mobile ? "[PRESENT]" : "[MISSING]",
    });
    const { firstName, lastName, mobile } = req.body;
    if (!req.user) {
      stepLogger.fail(new Error("Not authenticated"), { reason: "not_authenticated" });
      errorResponse(res, "Not authenticated", 401);
      return;
    }
    stepLogger.step("user-lookup-started", { userId: req.user._id.toString() });
    const user = await User.findById(req.user._id);
    stepLogger.step("user-lookup-completed", { userFound: !!user, userId: user ? user._id.toString() : null });
    if (!user) {
      stepLogger.fail(new Error("User not found"), { reason: "user_not_found" });
      errorResponse(res, "User not found", 404);
      return;
    }
    if (mobile) {
      stepLogger.step("mobile-duplicate-check-started", { mobile: mobile.replace(/(\d{2}).*(\d{3})/, "$1***$2") });
      const existingUser = await User.findOne({ mobile, _id: { $ne: user._id } });
      if (existingUser) {
        stepLogger.fail(new Error("Mobile already exists"), { reason: "mobile_already_exists" });
        errorResponse(res, "This mobile number is already registered", 400);
        return;
      }
      stepLogger.step("mobile-duplicate-check-completed", { mobileAvailable: true });
    }
    stepLogger.step("profile-update-started", { userId: user._id.toString() });
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (mobile) user.mobile = mobile;
    await user.save();
    stepLogger.step("profile-update-completed");
    await user.populate("role");
    stepLogger.complete({ userId: user._id.toString(), profileUpdateSuccessful: true });
    successResponse(res, { user: user }, "Profile updated successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "update-student-profile", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

const ADMISSION_TYPE_REQUIREMENTS: Record<string, { required: string[]; academicFields: string[] }> = {
  POLYTECHNIC: {
    required: ['name', 'email', 'address', 'admissionType', 'tenthMarks'],
    academicFields: ['tenthMarks'],
  },
  ENGINEERING_FIRST_YEAR: {
    required: ['name', 'email', 'address', 'admissionType', 'tenthMarks', 'twelfthMarks', 'cetScore'],
    academicFields: ['tenthMarks', 'twelfthMarks', 'cetScore'],
  },
  DIRECT_SECOND_YEAR: {
    required: ['name', 'email', 'address', 'admissionType', 'diplomaCollege', 'diplomaPercentage'],
    academicFields: ['diplomaCollege', 'diplomaCgpa', 'diplomaPercentage', 'diplomaYearOfPassing'],
  },
  DIRECT_SECOND_YEAR_DIPLOMA: {
    required: ['name', 'email', 'address', 'admissionType', 'diplomaCollege', 'diplomaPercentage'],
    academicFields: ['diplomaCollege', 'diplomaCgpa', 'diplomaPercentage', 'diplomaYearOfPassing'],
  },
  DIRECT_SECOND_YEAR_FE: {
    required: ['name', 'email', 'address', 'admissionType', 'previousCollegeName'],
    academicFields: ['previousCollegeName', 'previousCollegeAddress'],
  },
  COLLEGE_TRANSFER: {
    required: ['name', 'email', 'address', 'admissionType', 'transferType', 'previousCollegeName'],
    academicFields: [],
  },
  BRANCH_CHANGE: {
    required: ['name', 'email', 'address', 'admissionType', 'transferType', 'previousCollegeName'],
    academicFields: [],
  },
};

const COMMON_REQUIRED = ['name', 'email', 'address', 'category', 'primaryCourse'];

export const createApplication = asyncHandler(async (req: TypedRequest<CREATE_APPLICATION_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("create-student-application", correlationId, req.user?._id?.toString());
  try {
    stepLogger.step("validation-started", {
      name: req.body.name ? "[PRESENT]" : "[MISSING]",
      email: req.body.email ? "[PRESENT]" : "[MISSING]",
      admissionType: req.body.admissionType || "[NOT SET]",
    });

    if (!req.user) {
      stepLogger.fail(new Error("Not authenticated"), { reason: "not_authenticated" });
      errorResponse(res, "Not authenticated", 401);
      return;
    }

    const { admissionType } = req.body;
    const requirements = admissionType ? ADMISSION_TYPE_REQUIREMENTS[admissionType] : null;

    if (admissionType && !requirements) {
      stepLogger.fail(new Error("Invalid admission type"), { admissionType });
      errorResponse(res, `Invalid admission type: ${admissionType}`, 400);
      return;
    }

    const requiredFields = requirements
      ? [...new Set([...COMMON_REQUIRED, ...requirements.required])]
      : [...COMMON_REQUIRED, 'tenthMarks', 'twelfthMarks', 'cetScore'];

    const missing: string[] = [];
    for (const field of requiredFields) {
      if (req.body[field as keyof typeof req.body] === undefined || req.body[field as keyof typeof req.body] === null || req.body[field as keyof typeof req.body] === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      stepLogger.fail(new Error("Validation failed"), { missingFields: missing });
      errorResponse(res, `Required fields missing: ${missing.join(', ')}`, 400);
      return;
    }

    stepLogger.step("validation-completed", { validationPassed: true });

    const {
      name, email, address,
      tenthMarks, twelfthMarks, cetScore, jeeScore,
      diplomaCollege, diplomaCgpa, diplomaPercentage, diplomaYearOfPassing,
      transferType, previousCollegeName, previousCollegeAddress,
      category, primaryCourse, secondaryCourse,
      previousCategory,
      category2, primaryCourse2, secondaryCourse2,
      documents,
    } = req.body;

    if (primaryCourse === secondaryCourse) {
      stepLogger.fail(new Error("Same course selected"), { reason: "primary_secondary_same" });
      errorResponse(res, "Primary and secondary course cannot be the same", 400);
      return;
    }

    if (admissionType && ADMISSION_TYPE_DOMAINS[admissionType]) {
      const allowedDomains = ADMISSION_TYPE_DOMAINS[admissionType];
      const selectedCategory = await Category.findById(category);
      if (selectedCategory && !allowedDomains.includes(selectedCategory.domain)) {
        stepLogger.fail(new Error("Category not allowed for this admission type"), {
          admissionType, categoryDomain: selectedCategory.domain,
        });
        errorResponse(res, `The selected category "${selectedCategory.name}" is not available for ${admissionType.replace(/_/g, ' ').toLowerCase()} admission`, 400);
        return;
      }
    }

    stepLogger.step("duplicate-application-check-started", { userId: req.user._id.toString() });
    const existingApplication = await Application.findOne({
      user: req.user._id,
      status: { $nin: ["DRAFT", "REJECTED"] },
    });
    if (existingApplication) {
      stepLogger.fail(new Error("Application already exists"), {
        reason: "application_already_exists",
        applicationStatus: existingApplication.status,
      });
      errorResponse(res, "You already have an active application", 400);
      return;
    }
    stepLogger.step("duplicate-application-check-completed", { noExistingApplication: true });

    stepLogger.step("application-creation-started", {
      userId: req.user._id.toString(),
      admissionType: admissionType || 'ENGINEERING_FIRST_YEAR',
      category, primaryCourse,
    });

    const application = await Application.create({
      user: req.user._id,
      name, email, address,
      admissionType: admissionType || 'ENGINEERING_FIRST_YEAR',
      tenthMarks, twelfthMarks, cetScore, jeeScore,
      diplomaCollege, diplomaCgpa, diplomaPercentage, diplomaYearOfPassing,
      transferType, previousCollegeName, previousCollegeAddress,
      category, primaryCourse, secondaryCourse,
      previousCategory,
      category2, primaryCourse2, secondaryCourse2,
      documents: documents || [],
      status: "SUBMITTED",
      submittedAt: new Date(),
      statusHistory: [{ status: "SUBMITTED", changedAt: new Date(), changedBy: req.user._id }],
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    stepLogger.step("application-creation-completed", { applicationId: application._id.toString() });
    await application.populate(["category", "primaryCourse", "secondaryCourse", "previousCategory", "category2", "primaryCourse2", "secondaryCourse2"]);
    stepLogger.complete({
      userId: req.user._id.toString(),
      applicationId: application._id.toString(),
      applicationCreated: true,
    });
    successResponse(res, { application }, "Application submitted successfully", 201);
  } catch (error) {
    stepLogger.fail(error, { operation: "create-student-application", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const getMyApplication = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-student-application", correlationId, req.user?._id?.toString());
  try {
    stepLogger.step("authentication-check-completed", { userId: req.user._id.toString(), authenticated: true });
    stepLogger.step("application-retrieval-started", { userId: req.user._id.toString() });
    const application = await Application.findOne({
      user: req.user._id,
      isActive: true,
    }).populate([
      { path: "category" },
      { path: "primaryCourse" },
      { path: "secondaryCourse" },
      { path: "previousCategory" },
      { path: "category2" },
      { path: "primaryCourse2" },
      { path: "secondaryCourse2" },
      { path: "allocatedCourse" },
    ]);
    stepLogger.step("application-retrieval-completed", {
      applicationFound: !!application,
      applicationId: application ? application._id.toString() : null,
    });
    if (!application) {
      stepLogger.step("no-application-found", { userId: req.user._id.toString() });
      successResponse(res, { application: null }, "No application found");
      return;
    }
    stepLogger.complete({
      userId: req.user._id.toString(),
      applicationId: application._id.toString(),
      applicationRetrieved: true,
    });
    successResponse(res, { application }, "Application retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "get-student-application", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const updateApplication = asyncHandler(async (req: TypedRequest<UPDATE_APPLICATION_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("update-student-application", correlationId, req.user?._id?.toString());
  try {
    stepLogger.step("application-lookup-started", { userId: req.user._id.toString() });
    const application = await Application.findOne({
      user: req.user._id,
      status: { $in: ["DRAFT", "SUBMITTED"] },
    });
    stepLogger.step("application-lookup-completed", {
      applicationFound: !!application,
      applicationId: application ? application._id.toString() : null,
    });
    if (!application) {
      stepLogger.fail(new Error("No draft application"), { reason: "no_draft_application" });
      errorResponse(res, "No draft application found", 404);
      return;
    }
    const updates = req.body;
    const allowedUpdates = [
      "name", "email", "address", "admissionType",
      "tenthMarks", "twelfthMarks", "cetScore", "jeeScore",
      "diplomaCollege", "diplomaCgpa", "diplomaPercentage", "diplomaYearOfPassing",
      "transferType", "previousCollegeName", "previousCollegeAddress",
      "category", "primaryCourse", "secondaryCourse",
      "previousCategory",
      "category2", "primaryCourse2", "secondaryCourse2",
      "documents",
    ];

    console.log("Documents in update payload:", updates['documents']);

    for (const key of allowedUpdates) {
      if (updates[key as keyof typeof updates] !== undefined) {
        if (key === 'documents') {
          if (Array.isArray(updates[key]) && updates[key].length > 0) {
            console.log("Updating documents with:", updates[key]);
            (application as any)[key] = updates[key];
          } else {
            console.log("Skipping empty documents array - keeping existing documents");
          }
        } else {
          (application as any)[key] = updates[key as keyof typeof updates];
        }
      }
    }
    application.updatedBy = req.user._id;
    await application.save();
    await application.populate(["category", "primaryCourse", "secondaryCourse", "previousCategory", "category2", "primaryCourse2", "secondaryCourse2"]);
    stepLogger.step("application-update-completed");
    stepLogger.complete({
      userId: req.user._id.toString(),
      applicationId: application._id.toString(),
      applicationUpdated: true,
    });
    successResponse(res, { application }, "Application updated successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "update-student-application", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const getCategories = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-categories", correlationId);
  try {
    stepLogger.step("category-retrieval-started");
    const filter: any = { isActive: true };
    const { admissionType } = req.query;
    if (admissionType && typeof admissionType === 'string' && ADMISSION_TYPE_DOMAINS[admissionType]) {
      filter.domain = { $in: ADMISSION_TYPE_DOMAINS[admissionType] };
    }
    const categories = await Category.find(filter).sort({ displayOrder: 1 });
    stepLogger.step("category-retrieval-completed", { categoryCount: categories.length });
    stepLogger.complete({ categoryCount: categories.length, categoriesRetrieved: true });
    successResponse(res, { categories }, "Categories retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "get-categories", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const getCourses = asyncHandler(async (req: TypedRequest<GET_COURSES_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-courses", correlationId);
  try {
    stepLogger.step("course-retrieval-started", { categoryId: req.params.categoryId });

    const filter: any = { isActive: true };

    if (req.query.parentCourse === 'false') {
      filter.category = req.params.categoryId;
      filter.parentCourse = { $exists: false };
    } else if (req.query.parentCourse) {
      filter.parentCourse = req.query.parentCourse;
      filter.category = req.params.categoryId;
    } else {
      filter.category = req.params.categoryId;
    }

    const courses = await Course.find(filter).sort({ displayOrder: 1 });
    stepLogger.step("course-retrieval-completed", { courseCount: courses.length });
    stepLogger.complete({ courseCount: courses.length, coursesRetrieved: true });
    successResponse(res, { courses }, "Courses retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "get-courses", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const getAdmissionTypes = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-admission-types", correlationId);
  try {
    stepLogger.step("admission-types-retrieval-started");
    const admissionTypes = await AdmissionType.find({ isActive: true }).sort({ displayOrder: 1 });
    stepLogger.step("admission-types-retrieval-completed", { count: admissionTypes.length });
    stepLogger.complete({ count: admissionTypes.length, retrieved: true });
    successResponse(res, { admissionTypes }, "Admission types retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, { operation: "get-admission-types", errorType: error.name, errorMessage: error.message });
    throw error;
  }
});

export const uploadDocument = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("upload-document", correlationId, req.user?._id?.toString());

  try {
    stepLogger.step("upload-started", { userId: req.user?._id?.toString() });

    console.log("Upload request received:", {
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileMime: req.file?.mimetype,
      fileSize: req.file?.size,
      body: req.body,
      headers: req.headers['content-type'],
    });

    if (!req.file) {
      console.error("No file in request - multer may not be working");
      stepLogger.fail(new Error("No file provided"), { reason: "no_file" });
      errorResponse(res, "No file uploaded", 400);
      return;
    }

    const documentType = req.body.type;
    const validTypes = [
      'tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'jee_result', 'photo',
      'leaving_certificate', 'aadhaar_card', 'passport_photo', 'cet_jee_scorecard',
      'diploma_marksheet', 'diploma_result', 'diploma_certificate',
      'previous_college_bonafide', 'previous_year_marksheet', 'transfer_certificate',
      'migration_certificate', 'fee_receipt', 'first_year_marksheet',
    ];

    if (!documentType || !validTypes.includes(documentType)) {
      stepLogger.fail(new Error("Invalid document type"), { documentType });
      errorResponse(res, `Invalid document type. Must be one of: ${validTypes.join(', ')}`, 400);
      return;
    }

    stepLogger.step("uploading-to-cloudinary", {
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      documentType,
    });

    const uploadResult = await uploadToCloudinary(
      req.file,
      'skillhub',
      correlationId,
      req.user?._id?.toString(),
      req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
    );

    console.log("Cloudinary upload result:", {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
    });

    stepLogger.step("upload-completed", { url: uploadResult.url, publicId: uploadResult.publicId });
    stepLogger.complete({ documentType, url: uploadResult.url });

    let application = await Application.findOne({ user: req.user._id, isActive: true });

    if (!application) {
      stepLogger.step("creating-draft-application-for-document");
      application = await Application.create({
        user: req.user._id,
        name: req.user?.firstName + ' ' + req.user?.lastName || 'Draft',
        email: req.user?.email || '',
        address: '',
        admissionType: 'ENGINEERING_FIRST_YEAR',
        tenthMarks: 0,
        twelfthMarks: 0,
        cetScore: 0,
        jeeScore: 0,
        category: null,
        primaryCourse: null,
        secondaryCourse: null,
        documents: [],
        status: 'DRAFT',
        isActive: true,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
    }

    const existingIndex = application.documents.findIndex(d => d.type === documentType);
    if (existingIndex >= 0) {
      application.documents[existingIndex] = {
        type: documentType,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedAt: new Date(),
      };
    } else {
      application.documents.push({
        type: documentType,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedAt: new Date(),
      });
    }
    await application.save();

    console.log("Document saved to application:", {
      applicationId: application._id.toString(),
      documentType,
      url: uploadResult.url,
      documentsCount: application.documents.length,
    });

    stepLogger.step("document-saved-to-application", { applicationId: application._id.toString() });

    successResponse(
      res,
      { url: uploadResult.url, publicId: uploadResult.publicId, type: documentType, format: uploadResult.format },
      "Document uploaded and saved successfully"
    );
  } catch (error) {
    stepLogger.fail(error as Error, { operation: "upload-document", errorMessage: (error as Error).message });
    throw error;
  }
});

export const deleteDocument = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("delete-document", correlationId, req.user?._id?.toString());

  try {
    stepLogger.step("delete-started", { userId: req.user?._id?.toString() });

    const { documentType } = req.params;

    if (!documentType) {
      stepLogger.fail(new Error("Document type required"), { reason: "missing_document_type" });
      errorResponse(res, "Document type is required", 400);
      return;
    }

    const application = await Application.findOne({ user: req.user._id, isActive: true });

    if (!application) {
      stepLogger.fail(new Error("No application found"), { reason: "no_application" });
      errorResponse(res, "No active application found", 404);
      return;
    }

    const docIndex = application.documents.findIndex(d => d.type === documentType);

    if (docIndex < 0) {
      stepLogger.fail(new Error("Document not found"), { documentType });
      errorResponse(res, "Document not found in your application", 404);
      return;
    }

    const doc = application.documents[docIndex];

    if (doc.publicId) {
      stepLogger.step("deleting-from-cloudinary", { publicId: doc.publicId });
      await deleteFromCloudinary(doc.publicId, correlationId, req.user?._id?.toString());
    }

    application.documents.splice(docIndex, 1);
    await application.save();

    stepLogger.complete({ documentType, removedFromApplication: true });

    successResponse(res, { type: documentType }, "Document removed successfully");
  } catch (error) {
    stepLogger.fail(error as Error, { operation: "delete-document", errorMessage: (error as Error).message });
    throw error;
  }
});
