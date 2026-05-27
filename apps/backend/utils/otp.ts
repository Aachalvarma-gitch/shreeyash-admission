import otpGenerator from 'otp-generator';
import crypto from 'crypto';

/**
 * Generate OTP
 */
export const generateOTP = (length: number = 6): string => {
  return otpGenerator.generate(length, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
};

/**
 * Hash OTP for storage
 */
export const hashOTP = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify OTP
 */
export const verifyOTP = (inputOTP: string, hashedOTP: string): boolean => {
  const inputHash = hashOTP(inputOTP);
  return inputHash === hashedOTP;
};

/**
 * Get OTP expiry date
 */
export const getOTPExpiry = (): Date => {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10');
  return new Date(Date.now() + minutes * 60 * 1000);
};

