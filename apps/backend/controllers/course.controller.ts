import asyncHandler from "express-async-handler";
import { body } from "express-validator";
import type { TypedRequest, AuthRequest } from "@skillhub/types/src/express";
import Category from "../models/Category.model.js";
import Course from "../models/Course.model.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { validateRequest } from "../utils/validation.js";
import { StepLogger } from "../utils/stepLogger.js";
import type {
  CREATE_CATEGORY_REQUEST,
  UPDATE_CATEGORY_REQUEST,
  CREATE_COURSE_REQUEST,
  UPDATE_COURSE_REQUEST,
  GET_PUBLIC_COURSES_REQUEST,
} from "@skillhub/types/src/course"

export const getPublicCategories = asyncHandler(async (req: TypedRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-public-categories", correlationId);
  try {
    stepLogger.step("category-retrieval-started");
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
    stepLogger.step("category-retrieval-completed", {
      categoryCount: categories.length,
    });
    stepLogger.complete({
      categoryCount: categories.length,
      categoriesRetrieved: true,
    });
    successResponse(res, { categories }, "Categories retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "get-public-categories",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const getPublicCourses = asyncHandler(async (req: TypedRequest<GET_PUBLIC_COURSES_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("get-public-courses", correlationId);
  try {
    stepLogger.step("course-retrieval-started", {
      categoryId: req.params.categoryId,
    });
    const courses = await Course.find({
      category: req.params.categoryId,
      isActive: true,
    }).sort({ displayOrder: 1 });
    stepLogger.step("course-retrieval-completed", {
      courseCount: courses.length,
    });
    stepLogger.complete({
      courseCount: courses.length,
      coursesRetrieved: true,
    });
    successResponse(res, { courses }, "Courses retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "get-public-courses",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

const categoryValidation = [
  body("name").notEmpty().withMessage("Category name is required"),
  body("slug").notEmpty().withMessage("Category slug is required"),
  body("description").optional().isString(),
  body("displayOrder").optional().isInt({ min: 0 }),
];

export const getCategories = asyncHandler(async (req: any, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "get-categories",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("authentication-check-completed", {
      userId: req.user._id.toString(),
      authenticated: true,
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0;
    
    stepLogger.step("category-retrieval-started", { page, limit });
    
    const query = Category.find();
    if (limit > 0) {
      query.skip((page - 1) * limit).limit(limit);
    }
    
    const categories = await query.sort({ displayOrder: 1 });
    const total = await Category.countDocuments();
    
    stepLogger.step("category-retrieval-completed", {
      categoryCount: categories.length,
    });
    stepLogger.complete({
      categoryCount: categories.length,
      categoriesRetrieved: true,
    });
    
    const response: any = { categories };
    if (limit > 0) {
      response.pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      };
    }
    
    successResponse(res, response, "Categories retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "get-categories",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const createCategory = asyncHandler(async (req: AuthRequest<CREATE_CATEGORY_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "create-category",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("validation-started", {
      name: req.body.name ? "[PRESENT]" : "[MISSING]",
      slug: req.body.slug ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      categoryValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { name, slug, description, displayOrder } = req.body;
    stepLogger.step("duplicate-check-started", { slug });
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      stepLogger.fail(new Error("Category already exists"), {
        reason: "category_already_exists",
      });
      errorResponse(res, "Category with this slug already exists", 400);
      return;
    }
    stepLogger.step("duplicate-check-completed", { noDuplicate: true });
    stepLogger.step("category-creation-started", { name, slug });
    const category = await Category.create({
      name,
      slug,
      description,
      displayOrder: displayOrder || 0,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    stepLogger.step("category-creation-completed", {
      categoryId: category._id.toString(),
    });
    stepLogger.complete({
      categoryId: category._id.toString(),
      categoryCreated: true,
    });
    successResponse(res, { category }, "Category created successfully", 201);
  } catch (error) {
    stepLogger.fail(error, {
      operation: "create-category",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const updateCategory = asyncHandler(async (req: AuthRequest<UPDATE_CATEGORY_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "update-category",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("validation-started", {
      name: req.body.name ? "[PRESENT]" : "[MISSING]",
      slug: req.body.slug ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      categoryValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { name, slug, description, displayOrder, isActive } = req.body;
    stepLogger.step("category-lookup-started", { categoryId: req.params.id });
    const category = await Category.findById(req.params.id);
    stepLogger.step("category-lookup-completed", {
      categoryFound: !!category,
      categoryId: category ? category._id.toString() : null,
    });
    if (!category) {
      stepLogger.fail(new Error("Category not found"), {
        reason: "category_not_found",
      });
      errorResponse(res, "Category not found", 404);
      return;
    }
    stepLogger.step("duplicate-check-started", { slug });
    const duplicateCategory = await Category.findOne({
      slug,
      _id: { $ne: category._id },
    });
    if (duplicateCategory) {
      stepLogger.fail(new Error("Slug already exists"), {
        reason: "slug_already_exists",
      });
      errorResponse(res, "Category with this slug already exists", 400);
      return;
    }
    stepLogger.step("duplicate-check-completed", { noDuplicate: true });
    stepLogger.step("category-update-started", { categoryId: category._id.toString() });
    category.name = name;
    category.slug = slug;
    category.description = description;
    category.displayOrder = displayOrder;
    category.isActive = isActive;
    category.updatedBy = req.user._id;
    await category.save();
    stepLogger.step("category-update-completed");
    stepLogger.complete({
      categoryId: category._id.toString(),
      categoryUpdated: true,
    });
    successResponse(res, { category }, "Category updated successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "update-category",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const deleteCategory = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "delete-category",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("category-lookup-started", { categoryId: req.params.id });
    const category = await Category.findById(req.params.id);
    stepLogger.step("category-lookup-completed", {
      categoryFound: !!category,
      categoryId: category ? category._id.toString() : null,
    });
    if (!category) {
      stepLogger.fail(new Error("Category not found"), {
        reason: "category_not_found",
      });
      errorResponse(res, "Category not found", 404);
      return;
    }
    stepLogger.step("course-count-check-started", {
      categoryId: category._id.toString(),
    });
    const coursesCount = await Course.countDocuments({ category: category._id });
    stepLogger.step("course-count-check-completed", {
      coursesCount,
    });
    if (coursesCount > 0) {
      stepLogger.fail(new Error("Cannot delete category with courses"), {
        reason: "category_has_courses",
        coursesCount,
      });
      errorResponse(res, "Cannot delete category with courses", 400);
      return;
    }
    stepLogger.step("category-deletion-started", { categoryId: category._id });
    await Category.findByIdAndDelete(req.params.id);
    stepLogger.step("category-deletion-completed");
    stepLogger.complete({
      categoryId: category._id.toString(),
      categoryDeleted: true,
    });
    successResponse(res, null, "Category deleted successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "delete-category",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

const courseValidation = [
  body("name").notEmpty().withMessage("Course name is required"),
  body("code").notEmpty().withMessage("Course code is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("duration").isInt({ min: 1 }).withMessage("Duration is required"),
  body("fees").optional().isFloat({ min: 0 }),
  body("seats").optional().isInt({ min: 0 }),
];

export const getCourses = asyncHandler(async (req: any, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "get-courses",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("authentication-check-completed", {
      userId: req.user._id.toString(),
      authenticated: true,
    });
    
    const { category, isActive } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0;
    
    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    
    stepLogger.step("course-retrieval-start-ed", { filters: filter, page, limit });
    
    const query = Course.find(filter).populate("category");
    if (limit > 0) {
      query.skip((page - 1) * limit).limit(limit);
    }
    
    const courses = await query.sort({ displayOrder: 1 });
    const total = await Course.countDocuments(filter);
    
    stepLogger.step("course-retrieval-completed", {
      courseCount: courses.length,
    });
    stepLogger.complete({
      courseCount: courses.length,
      coursesRetrieved: true,
    });
    
    const response: any = { courses };
    if (limit > 0) {
      response.pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      };
    }
    
    successResponse(res, response, "Courses retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "get-courses",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const createCourse = asyncHandler(async (req: AuthRequest<CREATE_COURSE_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "create-course",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("validation-started", {
      name: req.body.name ? "[PRESENT]" : "[MISSING]",
      code: req.body.code ? "[PRESENT]" : "[MISSING]",
      category: req.body.category ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      courseValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const {
      name,
      code,
      category,
      description,
      duration,
      eligibility,
      fees,
      seats,
      displayOrder,
    } = req.body;
    stepLogger.step("duplicate-check-started", { code });
    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      stepLogger.fail(new Error("Course already exists"), {
        reason: "course_already_exists",
      });
      errorResponse(res, "Course with this code already exists", 400);
      return;
    }
    stepLogger.step("duplicate-check-completed", { noDuplicate: true });
    stepLogger.step("course-creation-started", { name, code, category });
    const course = await Course.create({
      name,
      code,
      category,
      description,
      duration,
      eligibility,
      fees: fees || 0,
      seats: seats || 0,
      displayOrder: displayOrder || 0,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    stepLogger.step("course-creation-completed", {
      courseId: course._id.toString(),
    });
    await course.populate("category");
    stepLogger.complete({
      courseId: course._id.toString(),
      courseCreated: true,
    });
    successResponse(res, { course }, "Course created successfully", 201);
  } catch (error) {
    stepLogger.fail(error, {
      operation: "create-course",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const updateCourse = asyncHandler(async (req: AuthRequest<UPDATE_COURSE_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "update-course",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("validation-started", {
      name: req.body.name ? "[PRESENT]" : "[MISSING]",
      code: req.body.code ? "[PRESENT]" : "[MISSING]",
      category: req.body.category ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      courseValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const {
      name,
      code,
      category,
      description,
      duration,
      eligibility,
      fees,
      seats,
      displayOrder,
      isActive,
    } = req.body;
    stepLogger.step("course-lookup-started", { courseId: req.params.id });
    const course = await Course.findById(req.params.id);
    stepLogger.step("course-lookup-completed", {
      courseFound: !!course,
      courseId: course ? course._id.toString() : null,
    });
    if (!course) {
      stepLogger.fail(new Error("Course not found"), {
        reason: "course_not_found",
      });
      errorResponse(res, "Course not found", 404);
      return;
    }
    stepLogger.step("duplicate-check-started", { code });
    const duplicateCourse = await Course.findOne({
      code,
      _id: { $ne: course._id },
    });
    if (duplicateCourse) {
      stepLogger.fail(new Error("Code already exists"), {
        reason: "code_already_exists",
      });
      errorResponse(res, "Course with this code already exists", 400);
      return;
    }
    stepLogger.step("duplicate-check-completed", { noDuplicate: true });
    stepLogger.step("course-update-started", { courseId: course._id.toString() });
    course.name = name;
    course.code = code;
    course.category = category;
    course.description = description;
    course.duration = duration;
    course.eligibility = eligibility;
    course.fees = fees;
    course.seats = seats;
    course.displayOrder = displayOrder;
    course.isActive = isActive;
    course.updatedBy = req.user._id;
    await course.save();
    await course.populate("category");
    stepLogger.step("course-update-completed");
    stepLogger.complete({
      courseId: course._id.toString(),
      courseUpdated: true,
    });
    successResponse(res, { course }, "Course updated successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "update-course",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const deleteCourse = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "delete-course",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("course-lookup-started", { courseId: req.params.id });
    const course = await Course.findById(req.params.id);
    stepLogger.step("course-lookup-completed", {
      courseFound: !!course,
      courseId: course ? course._id.toString() : null,
    });
    if (!course) {
      stepLogger.fail(new Error("Course not found"), {
        reason: "course_not_found",
      });
      errorResponse(res, "Course not found", 404);
      return;
    }
    stepLogger.step("course-deletion-started", { courseId: course._id });
    await Course.findByIdAndDelete(req.params.id);
    stepLogger.step("course-deletion-completed");
    stepLogger.complete({
      courseId: course._id.toString(),
      courseDeleted: true,
    });
    successResponse(res, null, "Course deleted successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "delete-course",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});

//# sourceMappingURL=course.controller.js.map