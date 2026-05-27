import asyncHandler from "express-async-handler";
import { body } from "express-validator";
import User from "../models/User.model.js";
import Session from "../models/Session.model.js";
import Role from "../models/Role.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenExpiry,
  verifyToken,
} from "../utils/jwt.js";
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from "../utils/otp.js";
import { extractDeviceInfo } from "../utils/deviceInfo.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { validateRequest } from "../utils/validation.js";
import {
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
} from "../services/email.service.js";
import { StepLogger } from "../utils/stepLogger.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import type { AuthRequest } from "@skillhub/types";
import type {
  LOGIN_REQUEST,
  REGISTER_REQUEST,
  GOOGLE_LOGIN_REQUEST,
  SEND_OTP_REQUEST,
  VERIFY_OTP_LOGIN_REQUEST,
  REFRESH_TOKEN_REQUEST,
  FORGOT_PASSWORD_REQUEST,
  RESET_PASSWORD_REQUEST,
  CHANGE_PASSWORD_REQUEST,
} from "@skillhub/types/src/auth/index.js";
import { TypedRequest } from "@skillhub/types/src/express.js";
const registerValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("mobile")
    .matches(/^[0-9]{10}$/)
    .withMessage("Valid 10-digit mobile number is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
];
export const register = asyncHandler(async (req: TypedRequest<REGISTER_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "user-registration",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("validation-started", {
      email: req.body.email ? "[PRESENT]" : "[MISSING]",
      mobile: req.body.mobile ? "[PRESENT]" : "[MISSING]",
      firstName: req.body.firstName ? "[PRESENT]" : "[MISSING]",
      lastName: req.body.lastName ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      registerValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { email, mobile, password, firstName, lastName, companyName } =
      req.body;
    stepLogger.step("user-existence-check-started", {
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      mobile: mobile.replace(/(\d{2}).*(\d{3})/, "$1***$2"),
    });
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      stepLogger.fail(new Error("User already exists"), {
        reason: "user_already_exists",
        emailExists: !!existingUser.email,
        mobileExists: !!existingUser.mobile,
      });
      errorResponse(res, "User with this email or mobile already exists", 400);
      return;
    }
    stepLogger.step("user-existence-check-completed", {
      userAvailable: true,
    });
    stepLogger.step("role-lookup-started", { roleName: "Student" });
    let role = await Role.findOne({ name: "Student" });
    if (!role) {
      role = await Role.create({ name: "Student", description: "Student applicant", permissions: [] });
    }
    stepLogger.step("role-lookup-completed", { roleId: role._id.toString() });
    stepLogger.step("user-creation-started", {
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      mobile: mobile.replace(/(\d{2}).*(\d{3})/, "$1***$2"),
      roleId: role._id.toString(),
      createdBy: req.user?._id?.toString() || null,
    });
    const user = await User.create({
      email,
      mobile,
      password,
      firstName,
      lastName,
      role: role._id,
      companyName,
      createdBy: req.user?._id,
    });
    stepLogger.step("user-creation-completed", {
      userId: user._id.toString(),
    });
    stepLogger.step("role-population-started");
    await user.populate("role");
    stepLogger.step("role-population-completed");
    stepLogger.step("welcome-email-started", {
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
    });
    try {
      await sendWelcomeEmail(user);
      stepLogger.step("welcome-email-completed", { emailSent: true });
    } catch (emailError) {
      stepLogger.step("welcome-email-failed", {
        emailSent: false,
        errorType: emailError.name,
        errorMessage: emailError.message,
      });
      console.error("Failed to send welcome email:", emailError);
    }
    stepLogger.complete({
      userId: user._id.toString(),
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      mobile: mobile.replace(/(\d{2}).*(\d{3})/, "$1***$2"),
      registrationSuccessful: true,
    });
    successResponse(
      res,
      { user: { ...user.toObject(), password: undefined } },
      "User registered successfully",
      201,
    );
  } catch (error) {
    stepLogger.fail(error, {
      operation: "user-registration",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const googleLoginValidation = [
  body("token").notEmpty().withMessage("Google token is required"),
];
export const googleLogin = asyncHandler(async (req: TypedRequest<GOOGLE_LOGIN_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("google-login", correlationId);
  try {
    stepLogger.step("validation-started", {
      token: req.body.token ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      googleLoginValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { token } = req.body;
    stepLogger.step("google-token-verification-started");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      stepLogger.fail(new Error("Invalid Google token"), {
        reason: "invalid_google_token",
      });
      errorResponse(res, "Invalid Google token", 400);
      return;
    }
    stepLogger.step("google-token-verification-completed", {
      googleUserId: payload.sub,
      email: payload.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
    });
    const { email, given_name: firstName, family_name: lastName } = payload;
    stepLogger.step("user-lookup-started", {
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
    });
    let user = await User.findOne({ email }).populate("role");
    stepLogger.step("user-lookup-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
      userActive: user ? user.isActive : null,
    });
    if (!user) {
      stepLogger.step("role-lookup-started", {
        roleName: "Student",
      });
      let role = await Role.findOne({ name: "Student" });
      if (!role) {
        role = await Role.create({ name: "Student", description: "Student applicant", permissions: [] });
      }
      stepLogger.step("role-lookup-completed", {
        roleId: role._id.toString(),
      });
      stepLogger.step("user-creation-started", {
        email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
        firstName: firstName || "",
        lastName: lastName || "",
      });
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        email,
        mobile: "",
        password: randomPassword,
        firstName: firstName || "",
        lastName: lastName || "",
        role: role._id,
        isEmailVerified: true,
        googleId: payload.sub,
      });
      stepLogger.step("user-creation-completed", {
        userId: user._id.toString(),
      });
      try {
        await sendWelcomeEmail(user);
        stepLogger.step("welcome-email-completed", { emailSent: true });
      } catch (emailError) {
        stepLogger.step("welcome-email-failed", { emailSent: false });
        console.error("Failed to send welcome email:", emailError);
      }
    } else {
      if (!user.isActive) {
        stepLogger.fail(new Error("Account deactivated"), {
          reason: "account_deactivated",
        });
        errorResponse(res, "Account is deactivated", 401);
        return;
      }
    }
    stepLogger.step("login-attempts-reset-started", {
      previousAttempts: user.loginAttempts,
    });
    await user.resetLoginAttempts();
    stepLogger.step("login-attempts-reset-completed");
    stepLogger.step("token-generation-started", {
      userId: user._id.toString(),
    });
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    stepLogger.step("token-generation-completed", {
      accessTokenGenerated: !!accessToken,
      refreshTokenGenerated: !!refreshToken,
    });
    stepLogger.step("device-info-extraction-started", {
      userAgentPresent: !!req.get("user-agent"),
    });
    const deviceInfo = extractDeviceInfo(req.get("user-agent"));
    stepLogger.step("device-info-extraction-completed", {
      deviceInfo: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
      },
    });
    stepLogger.step("session-creation-started", {
      userId: user._id.toString(),
      ipAddress: req.ip,
    });
    const session = await Session.create({
      userId: user._id,
      accessToken,
      refreshToken,
      deviceInfo,
      ipAddress: req.ip,
      expiresAt: getTokenExpiry(process.env.JWT_REFRESH_EXPIRE || "7d"),
    });
    stepLogger.step("session-creation-completed", {
      sessionId: session._id.toString(),
      sessionCreated: !!session,
    });
    stepLogger.complete({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      googleLoginSuccessful: true,
    });
    successResponse(
      res,
      {
        user: { ...user.toObject(), password: undefined },
        accessToken,
        refreshToken,
        sessionId: session._id,
      },
      "Google login successful",
    );
  } catch (error) {
    stepLogger.fail(error, {
      operation: "google-login",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const loginValidation = [
  body("emailOrMobile").notEmpty().withMessage("Email or mobile is required"),
  body("password").notEmpty().withMessage("Password is required"),
];
export const login = asyncHandler(async (req: TypedRequest<LOGIN_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("user-login", correlationId);
  try {
    stepLogger.step("validation-started", {
      emailOrMobile: req.body.emailOrMobile ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(loginValidation.map((validation) => validation.run(req)));
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { emailOrMobile, password } = req.body;
    stepLogger.step("user-lookup-started", {
      identifier: emailOrMobile.includes("@") ? "email" : "mobile",
      identifierMasked: emailOrMobile.includes("@")
        ? emailOrMobile.replace(/(.{2}).*(@.*)/, "$1***$2")
        : emailOrMobile.replace(/(\d{2}).*(\d{3})/, "$1***$2"),
    });
    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }],
    })
      .select("+password")
      .populate("role");
    stepLogger.step("user-lookup-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
      userActive: user ? user.isActive : null,
    });
    if (!user) {
      stepLogger.fail(new Error("User not found"), {
        reason: "invalid_credentials",
      });
      errorResponse(res, "Invalid credentials", 401);
      return;
    }
    stepLogger.step("account-status-check", {
      isLocked: user.isLocked,
      isActive: user.isActive,
      loginAttempts: user.loginAttempts,
    });
    if (user.isLocked) {
      stepLogger.fail(new Error("Account locked"), {
        reason: "account_locked",
        loginAttempts: user.loginAttempts,
      });
      errorResponse(
        res,
        "Account is temporarily locked. Please try again later.",
        423,
      );
      return;
    }
    if (!user.isActive) {
      stepLogger.fail(new Error("Account deactivated"), {
        reason: "account_deactivated",
      });
      errorResponse(res, "Account is deactivated", 401);
      return;
    }
    stepLogger.step("password-verification-started");
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      stepLogger.step("password-verification-failed", { passwordValid: false });
      await user.incLoginAttempts();
      stepLogger.fail(new Error("Invalid password"), {
        reason: "invalid_credentials",
        loginAttempts: user.loginAttempts + 1,
        accountLocked: user.loginAttempts + 1 >= 5,
      });
      errorResponse(res, "Invalid credentials", 401);
      return;
    }
    stepLogger.step("password-verification-success", { passwordValid: true });
    stepLogger.step("login-attempts-reset-started", {
      previousAttempts: user.loginAttempts,
    });
    await user.resetLoginAttempts();
    stepLogger.step("login-attempts-reset-completed");
    stepLogger.step("token-generation-started", {
      userId: user._id.toString(),
    });
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    stepLogger.step("token-generation-completed", {
      accessTokenGenerated: !!accessToken,
      refreshTokenGenerated: !!refreshToken,
    });
    stepLogger.step("device-info-extraction-started", {
      userAgentPresent: !!req.get("user-agent"),
    });
    const deviceInfo = extractDeviceInfo(req.get("user-agent"));
    stepLogger.step("device-info-extraction-completed", {
      deviceInfo: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
      },
    });
    stepLogger.step("session-creation-started", {
      userId: user._id.toString(),
      ipAddress: req.ip,
    });
    const session = await Session.create({
      userId: user._id,
      accessToken,
      refreshToken,
      deviceInfo,
      ipAddress: req.ip,
      expiresAt: getTokenExpiry(process.env.JWT_REFRESH_EXPIRE || "7d"),
    });
    stepLogger.step("session-creation-completed", {
      sessionId: session._id.toString(),
      sessionCreated: !!session,
    });
    stepLogger.complete({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      loginSuccessful: true,
    });
    successResponse(
      res,
      {
        user: { ...user.toObject(), password: undefined },
        accessToken,
        refreshToken,
        sessionId: session._id,
      },
      "Login successful",
    );
  } catch (error) {
    stepLogger.fail(error, {
      operation: "user-login",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const sendOTPValidation = [
  body("emailOrMobile").notEmpty().withMessage("Email or mobile is required"),
];
export const sendOTP = asyncHandler(async (req: TypedRequest<SEND_OTP_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("send-otp", correlationId);
  try {
    stepLogger.step("validation-started", {
      emailOrMobile: req.body.emailOrMobile ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      sendOTPValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { emailOrMobile } = req.body;
    stepLogger.step("user-lookup-started", {
      identifier: emailOrMobile.includes("@") ? "email" : "mobile",
      identifierMasked: emailOrMobile.includes("@")
        ? emailOrMobile.replace(/(.{2}).*(@.*)/, "$1***$2")
        : emailOrMobile.replace(/(\d{2}).*(\d{3})/, "$1***$2"),
    });
    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }],
    }).select("+otp +otpExpire");
    stepLogger.step("user-lookup-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
      userActive: user ? user.isActive : null,
    });
    if (!user) {
      stepLogger.fail(new Error("User not found"), {
        reason: "user_not_found",
      });
      errorResponse(res, "User not found", 404);
      return;
    }
    if (!user.isActive) {
      stepLogger.fail(new Error("Account deactivated"), {
        reason: "account_deactivated",
      });
      errorResponse(res, "Account is deactivated", 401);
      return;
    }
    stepLogger.step("otp-generation-started");
    const otp = generateOTP(6);
    const hashedOTP = hashOTP(otp);
    stepLogger.step("otp-generation-completed", { otpLength: otp.length });
    stepLogger.step("otp-save-started", {
      userId: user._id.toString(),
      otpExpire: getOTPExpiry().toISOString(),
    });
    user.otp = hashedOTP;
    user.otpExpire = getOTPExpiry();
    await user.save();
    stepLogger.step("otp-save-completed");
    stepLogger.step("otp-email-started", {
      email: user.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      otpType: "login",
    });
    try {
      await sendOTPEmail(user.email, otp, "login");
      stepLogger.step("otp-email-completed", { emailSent: true });
      stepLogger.complete({
        userId: user._id.toString(),
        email: user.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
        otpSent: true,
      });
      successResponse(
        res,
        { message: "OTP sent successfully" },
        "OTP sent to your email",
      );
    } catch (emailError) {
      stepLogger.step("otp-email-failed", {
        emailSent: false,
        errorType: emailError.name,
        errorMessage: emailError.message,
      });
      console.error("Failed to send OTP email:", emailError);
      stepLogger.step("otp-cleanup-started");
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save();
      stepLogger.step("otp-cleanup-completed");
      stepLogger.fail(emailError, {
        operation: "send-otp",
        reason: "email_send_failed",
      });
      errorResponse(res, "Failed to send OTP", 500);
      return;
    }
  } catch (error) {
    stepLogger.fail(error, {
      operation: "send-otp",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const verifyOTPLoginValidation = [
  body("emailOrMobile").notEmpty().withMessage("Email or mobile is required"),
  body("otp").notEmpty().withMessage("OTP is required"),
];
export const verifyOTPLogin = asyncHandler(async (req: TypedRequest<VERIFY_OTP_LOGIN_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("verify-otp-login", correlationId);
  try {
    stepLogger.step("validation-started", {
      emailOrMobile: req.body.emailOrMobile ? "[PRESENT]" : "[MISSING]",
      otp: req.body.otp ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      verifyOTPLoginValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { emailOrMobile, otp } = req.body;
    stepLogger.step("user-lookup-started", {
      identifier: emailOrMobile.includes("@") ? "email" : "mobile",
      identifierMasked: emailOrMobile.includes("@")
        ? emailOrMobile.replace(/(.{2}).*(@.*)/, "$1***$2")
        : emailOrMobile.replace(/(\d{2}).*(\d{3})/, "$1***$2"),
    });
    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }],
    })
      .select("+otp +otpExpire")
      .populate("role");
    stepLogger.step("user-lookup-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
      userActive: user ? user.isActive : null,
    });
    if (!user) {
      stepLogger.fail(new Error("User not found"), {
        reason: "invalid_credentials",
      });
      errorResponse(res, "Invalid credentials", 401);
      return;
    }
    if (!user.isActive) {
      stepLogger.fail(new Error("Account deactivated"), {
        reason: "account_deactivated",
      });
      errorResponse(res, "Account is deactivated", 401);
      return;
    }
    stepLogger.step("otp-expiry-check", {
      otpExpire: user.otpExpire?.toISOString(),
      currentTime: new Date().toISOString(),
      isExpired: !user.otpExpire || user.otpExpire < new Date(),
    });
    if (!user.otpExpire || user.otpExpire < new Date()) {
      stepLogger.fail(new Error("OTP expired"), { reason: "otp_expired" });
      errorResponse(res, "OTP has expired", 400);
      return;
    }
    stepLogger.step("otp-verification-started");
    const isOTPValid = user.otp && verifyOTP(otp, user.otp);
    stepLogger.step("otp-verification-completed", { otpValid: isOTPValid });
    if (!isOTPValid) {
      stepLogger.fail(new Error("Invalid OTP"), { reason: "invalid_otp" });
      errorResponse(res, "Invalid OTP", 401);
      return;
    }
    stepLogger.step("otp-clear-started", { userId: user._id.toString() });
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();
    stepLogger.step("otp-clear-completed");
    stepLogger.step("token-generation-started", {
      userId: user._id.toString(),
    });
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    stepLogger.step("token-generation-completed", {
      accessTokenGenerated: !!accessToken,
      refreshTokenGenerated: !!refreshToken,
    });
    stepLogger.step("device-info-extraction-started", {
      userAgentPresent: !!req.get("user-agent"),
    });
    const deviceInfo = extractDeviceInfo(req.get("user-agent"));
    stepLogger.step("device-info-extraction-completed", {
      deviceInfo: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
      },
    });
    stepLogger.step("session-creation-started", {
      userId: user._id.toString(),
      ipAddress: req.ip,
    });
    const session = await Session.create({
      userId: user._id,
      accessToken,
      refreshToken,
      deviceInfo,
      ipAddress: req.ip,
      expiresAt: getTokenExpiry(process.env.JWT_REFRESH_EXPIRE || "7d"),
    });
    stepLogger.step("session-creation-completed", {
      sessionId: session._id.toString(),
      sessionCreated: !!session,
    });
    stepLogger.complete({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      loginSuccessful: true,
      loginMethod: "otp",
    });
    successResponse(
      res,
      {
        user: { ...user.toObject(), otp: undefined, otpExpire: undefined },
        accessToken,
        refreshToken,
        sessionId: session._id,
      },
      "Login successful",
    );
  } catch (error) {
    stepLogger.fail(error, {
      operation: "verify-otp-login",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];
export const refreshToken = asyncHandler(async (req: TypedRequest<REFRESH_TOKEN_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("refresh-token", correlationId);
  try {
    stepLogger.step("validation-started", {
      refreshToken: req.body.refreshToken ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      refreshTokenValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { refreshToken: token } = req.body;
    if (!token) {
      stepLogger.fail(new Error("Refresh token missing"), {
        reason: "token_required",
      });
      errorResponse(res, "Refresh token is required", 400);
      return;
    }
    stepLogger.step("token-verification-started");
    const decoded = verifyToken(token, true);
    stepLogger.step("token-verification-completed", {
      userId: decoded.id,
      tokenValid: true,
    });
    stepLogger.step("session-lookup-started", {
      userId: decoded.id,
      tokenPresent: !!token,
    });
    const session = await Session.findOne({
      userId: decoded.id,
      refreshToken: token,
      isActive: true,
    });
    stepLogger.step("session-lookup-completed", {
      sessionFound: !!session,
      sessionId: session ? session._id.toString() : null,
    });
    if (!session) {
      stepLogger.fail(new Error("Invalid refresh token"), {
        reason: "invalid_token",
      });
      errorResponse(res, "Invalid refresh token", 401);
      return;
    }
    stepLogger.step("token-regeneration-started", { userId: decoded.id });
    const newAccessToken = generateAccessToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);
    stepLogger.step("token-regeneration-completed", {
      accessTokenGenerated: !!newAccessToken,
      refreshTokenGenerated: !!newRefreshToken,
    });
    stepLogger.step("session-update-started", {
      sessionId: session._id.toString(),
      newExpiry: getTokenExpiry(
        process.env.JWT_REFRESH_EXPIRE || "7d",
      ).toISOString(),
    });
    session.accessToken = newAccessToken;
    session.refreshToken = newRefreshToken;
    session.expiresAt = getTokenExpiry(process.env.JWT_REFRESH_EXPIRE || "7d");
    await session.save();
    stepLogger.step("session-update-completed");
    stepLogger.complete({
      userId: decoded.id,
      sessionId: session._id.toString(),
      tokenRefreshSuccessful: true,
    });
    successResponse(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      "Token refreshed successfully",
    );
  } catch (error) {
    stepLogger.fail(error, {
      operation: "refresh-token",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
export const logout = asyncHandler(async (req: AuthRequest, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "user-logout",
    correlationId,
    req.user?._id?.toString(),
    req.session?._id?.toString(),
  );
  try {
    stepLogger.step("session-validation-started", {
      sessionPresent: !!req.session,
      userId: req.user?._id?.toString(),
    });
    if (!req.session) {
      stepLogger.fail(new Error("No active session"), {
        reason: "no_active_session",
      });
      errorResponse(res, "No active session", 400);
      return;
    }
    stepLogger.step("session-validation-completed", {
      sessionId: req.session._id.toString(),
      sessionActive: req.session.isActive,
    });
    stepLogger.step("session-deactivation-started", {
      sessionId: req.session._id.toString(),
      previousState: req.session.isActive,
    });
    req.session.isActive = false;
    await req.session.save();
    stepLogger.step("session-deactivation-completed", {
      newState: req.session.isActive,
    });
    stepLogger.complete({
      userId: req.user?._id?.toString(),
      sessionId: req.session._id.toString(),
      logoutSuccessful: true,
    });
    successResponse(res, null, "Logout successful");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "user-logout",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
];
export const forgotPassword = asyncHandler(async (req: TypedRequest<FORGOT_PASSWORD_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("forgot-password", correlationId);
  try {
    stepLogger.step("validation-started", {
      email: req.body.email ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      forgotPasswordValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { email } = req.body;
    stepLogger.step("user-lookup-started", {
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
    });
    const user = await User.findOne({ email }).select(
      "+passwordResetToken +passwordResetExpire",
    );
    stepLogger.step("user-lookup-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
    });
    if (!user) {
      stepLogger.step("user-not-found-response", {
        reason: "user_not_found_but_not_revealed",
      });
      stepLogger.complete({
        email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
        resetLinkSent: false,
        reason: "user_not_found",
      });
      successResponse(
        res,
        null,
        "If the email exists, a password reset link has been sent",
      );
      return;
    }
    stepLogger.step("reset-token-generation-started", {
      userId: user._id.toString(),
    });
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    stepLogger.step("reset-token-generation-completed", {
      tokenLength: resetToken.length,
    });
    stepLogger.step("reset-token-save-started", {
      userId: user._id.toString(),
      expireTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    user.passwordResetToken = hashedToken;
    user.passwordResetExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    stepLogger.step("reset-token-save-completed");
    stepLogger.step("reset-email-started", {
      email: user.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      tokenLength: resetToken.length,
    });
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      stepLogger.step("reset-email-completed", { emailSent: true });
      stepLogger.complete({
        userId: user._id.toString(),
        email: user.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
        resetLinkSent: true,
      });
      successResponse(
        res,
        null,
        "Password reset link has been sent to your email",
      );
    } catch (emailError) {
      stepLogger.step("reset-email-failed", {
        emailSent: false,
        errorType: emailError.name,
        errorMessage: emailError.message,
      });
      console.error("Failed to send reset email:", emailError);
      stepLogger.step("reset-token-cleanup-started");
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save();
      stepLogger.step("reset-token-cleanup-completed");
      stepLogger.fail(emailError, {
        operation: "forgot-password",
        reason: "email_send_failed",
      });
      errorResponse(res, "Failed to send reset email", 500);
      return;
    }
  } catch (error) {
    stepLogger.fail(error, {
      operation: "forgot-password",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];
export const resetPassword = asyncHandler(async (req: TypedRequest<RESET_PASSWORD_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger("reset-password", correlationId);
  try {
    stepLogger.step("validation-started", {
      token: req.body.token ? "[PRESENT]" : "[MISSING]",
      newPassword: req.body.newPassword ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      resetPasswordValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { token, newPassword } = req.body;
    stepLogger.step("token-hash-started", { tokenLength: token.length });
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    stepLogger.step("token-hash-completed");
    stepLogger.step("user-lookup-with-token-started", {
      currentTime: new Date().toISOString(),
    });
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpire: { $gt: Date.now() },
    }).select("+passwordResetToken +passwordResetExpire");
    stepLogger.step("user-lookup-with-token-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
      tokenValid: !!user,
    });
    if (!user) {
      stepLogger.fail(new Error("Invalid or expired reset token"), {
        reason: "invalid_token",
      });
      errorResponse(res, "Invalid or expired reset token", 400);
      return;
    }
    stepLogger.step("password-update-started", { userId: user._id.toString() });
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
    stepLogger.step("password-update-completed");
    stepLogger.step("session-invalidation-started", {
      userId: user._id.toString(),
    });
    const sessionResult = await Session.updateMany(
      { userId: user._id },
      { isActive: false },
    );
    stepLogger.step("session-invalidation-completed", {
      sessionsInvalidated: sessionResult.modifiedCount,
    });
    stepLogger.complete({
      userId: user._id.toString(),
      passwordResetSuccessful: true,
      sessionsInvalidated: sessionResult.modifiedCount,
    });
    successResponse(res, null, "Password reset successful");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "reset-password",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];
export const changePassword = asyncHandler(async (req: TypedRequest<CHANGE_PASSWORD_REQUEST>, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "change-password",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("validation-started", {
      currentPassword: req.body.currentPassword ? "[PRESENT]" : "[MISSING]",
      newPassword: req.body.newPassword ? "[PRESENT]" : "[MISSING]",
    });
    await Promise.all(
      changePasswordValidation.map((validation) => validation.run(req)),
    );
    if (!validateRequest(req, res)) {
      stepLogger.fail(new Error("Validation failed"), {
        validationErrors: "Request validation failed",
      });
      return;
    }
    stepLogger.step("validation-completed", { validationPassed: true });
    const { currentPassword, newPassword } = req.body;
    if (!req.user) {
      stepLogger.fail(new Error("Not authenticated"), {
        reason: "not_authenticated",
      });
      errorResponse(res, "Not authenticated", 401);
      return;
    }
    stepLogger.step("authentication-check-completed", {
      userId: req.user._id.toString(),
      authenticated: true,
    });
    stepLogger.step("user-lookup-started", { userId: req.user._id.toString() });
    const user = await User.findById(req.user._id).select("+password");
    stepLogger.step("user-lookup-completed", {
      userFound: !!user,
      userId: user ? user._id.toString() : null,
    });
    if (!user) {
      stepLogger.fail(new Error("User not found"), {
        reason: "user_not_found",
      });
      errorResponse(res, "User not found", 404);
      return;
    }
    stepLogger.step("current-password-verification-started");
    const isPasswordValid = await user.matchPassword(currentPassword);
    stepLogger.step("current-password-verification-completed", {
      passwordValid: isPasswordValid,
    });
    if (!isPasswordValid) {
      stepLogger.fail(new Error("Current password incorrect"), {
        reason: "incorrect_current_password",
      });
      errorResponse(res, "Current password is incorrect", 401);
      return;
    }
    stepLogger.step("password-update-started", { userId: user._id.toString() });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    stepLogger.step("password-update-completed");
    stepLogger.complete({
      userId: user._id.toString(),
      passwordChangeSuccessful: true,
    });
    successResponse(res, null, "Password changed successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "change-password",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
export const getProfile = asyncHandler(async (req: any, res: any) => {
  const correlationId = req.correlationId;
  const stepLogger = new StepLogger(
    "get-profile",
    correlationId,
    req.user?._id?.toString(),
  );
  try {
    stepLogger.step("authentication-check-started");
    if (!req.user) {
      stepLogger.fail(new Error("Not authenticated"), {
        reason: "not_authenticated",
      });
      errorResponse(res, "Not authenticated", 401);
      return;
    }
    stepLogger.step("authentication-check-completed", {
      userId: req.user._id.toString(),
      authenticated: true,
    });
    stepLogger.step("profile-retrieval-started", {
      userId: req.user._id.toString(),
    });
    stepLogger.step("profile-retrieval-completed", {
      profileRetrieved: true,
      userId: req.user._id.toString(),
    });
    stepLogger.complete({
      userId: req.user._id.toString(),
      profileRetrieved: true,
    });
    successResponse(res, { user: req.user }, "Profile retrieved successfully");
  } catch (error) {
    stepLogger.fail(error, {
      operation: "get-profile",
      errorType: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
});
//# sourceMappingURL=auth.controller.js.map
