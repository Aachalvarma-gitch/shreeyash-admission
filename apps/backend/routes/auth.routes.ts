import { Router } from 'express';

import { protect } from '../middlewares/auth.js';
import {
    changePassword, forgotPassword, getProfile, googleLogin, login, logout, refreshToken, register, resetPassword,
    sendOTP, verifyOTPLogin
} from '../controllers/auth.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTPLogin);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);
router.get('/profile', protect, getProfile);

export default router;

