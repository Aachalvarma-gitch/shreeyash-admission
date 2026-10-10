import asyncHandler from "express-async-handler";
import type { AuthRequest } from "@skillhub/types/src/express";
import Application from "../models/Application.model.js";
import Course from "../models/Course.model.js";
import AuditLog from "../models/AuditLog.model.js";
import { successResponse, errorResponse } from "../utils/response.js";

const populateAllocatedApplication = (applicationId: any) =>
  Application.findById(applicationId)
    .populate("user", "firstName lastName email mobile")
    .populate("category", "name")
    .populate("primaryCourse", "name code")
    .populate("secondaryCourse", "name code")
    .populate("allocatedCourse", "name code")
    .populate("category2", "name")
    .populate("primaryCourse2", "name code")
    .populate("secondaryCourse2", "name code");

const getUserRoleName = (user: any) => {
  if (typeof user?.role === "object" && user.role?.name) {
    return user.role.name;
  }

  return user?.role?.toString?.() || "Unknown";
};

const createAuditLogSafe = async (req: AuthRequest, data: any) => {
  try {
    await AuditLog.create({
      userId: req.user._id,
      userRole: getUserRoleName(req.user),
      ipAddress: req.ip,
      userAgent: req.get?.("user-agent"),
      status: "success",
      category: "general",
      ...data,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

export const allocateSeat = asyncHandler(async (req: AuthRequest, res: any) => {
  const { priority, courseId } = req.body;

  if (!priority || !courseId) {
    errorResponse(res, "priority and courseId are required", 400);
    return;
  }
  if (!["primary", "secondary"].includes(priority)) {
    errorResponse(res, "priority must be 'primary' or 'secondary'", 400);
    return;
  }

  const application = await Application.findById(req.params.id);
  if (!application) {
    errorResponse(res, "Application not found", 404);
    return;
  }

  if (application.allocatedCourse) {
    if (application.allocatedCourse.toString() === courseId.toString()) {
      const populated = await populateAllocatedApplication(application._id);
      successResponse(res, { application: populated }, "Seat already allocated to this student");
      return;
    }

    errorResponse(res, "Seat already allocated to a different course", 400);
    return;
  }

  if (!["VERIFIED", "MERIT_LIST", "SUBMITTED", "UNDER_REVIEW"].includes(application.status)) {
    errorResponse(res, `Cannot allocate seat for application in status: ${application.status}`, 400);
    return;
  }

  const course = await Course.findById(courseId);
  if (!course) {
    errorResponse(res, "Course not found", 404);
    return;
  }

  if (course.allocatedSeats >= course.seats) {
    errorResponse(res, "No seats available in this course", 400);
    return;
  }

  course.allocatedSeats += 1;
  await course.save();

  const oldStatus = application.status;
  application.allocatedCourse = course._id;
  application.status = "SEAT_ALLOCATED";
  application.statusHistory.push({
    status: "SEAT_ALLOCATED",
    changedAt: new Date(),
    changedBy: req.user._id,
    reason: `Seat allocated via ${priority} priority`,
  });
  await application.save();

  await createAuditLogSafe(req, {
    action: "update",
    resource: "application",
    resourceId: application._id,
    details: {
      action: "seat_allocation",
      priority,
      courseId: course._id,
      courseName: course.name,
      oldStatus,
      newStatus: "SEAT_ALLOCATED",
    },
  });

  const populated = await populateAllocatedApplication(application._id);

  successResponse(res, { application: populated }, "Seat allocated successfully");
});

export const waitlistApplication = asyncHandler(async (req: AuthRequest, res: any) => {
  const application = await Application.findById(req.params.id);
  if (!application) {
    errorResponse(res, "Application not found", 404);
    return;
  }

  const oldStatus = application.status;
  application.status = "MERIT_LIST";
  application.statusHistory.push({
    status: "MERIT_LIST",
    changedAt: new Date(),
    changedBy: req.user._id,
    reason: "Added to waitlist",
  });
  await application.save();

  await createAuditLogSafe(req, {
    action: "update",
    resource: "application",
    resourceId: application._id,
    details: { action: "waitlist", oldStatus, newStatus: "MERIT_LIST" },
  });

  const populated = await Application.findById(application._id)
    .populate("user", "firstName lastName email mobile")
    .populate("primaryCourse", "name code")
    .populate("secondaryCourse", "name code")
    .populate("allocatedCourse", "name code");

  successResponse(res, { application: populated }, "Application added to waitlist");
});

export const getSeatStatus = asyncHandler(async (_req: AuthRequest, res: any) => {
  const courses = await Course.find({ isActive: true }).populate("category", "name domain").lean();

  const seatStatuses = courses.map((course: any) => {
    const available = course.seats - course.allocatedSeats;
    let status: "available" | "limited" | "full";
    if (course.seats === 0) {
      status = "full";
    } else if (available <= 0) {
      status = "full";
    } else if (available < course.seats * 0.3) {
      status = "limited";
    } else {
      status = "available";
    }
    return {
      _id: course._id,
      name: course.name,
      code: course.code,
      category: course.category,
      totalSeats: course.seats,
      allocatedSeats: course.allocatedSeats,
      availableSeats: available,
      status,
    };
  });

  successResponse(res, { seatStatuses }, "Seat status retrieved successfully");
});
