import { DeviceInfo } from '../types/index.js';

/**
 * Extract device information from user agent
 */
export const extractDeviceInfo = (userAgent: string | undefined): DeviceInfo => {
  if (!userAgent) {
    return {
      userAgent: 'Unknown',
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
    };
  }

  const deviceInfo: DeviceInfo = {
    userAgent,
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Desktop',
  };

  // Detect browser
  if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
  else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
  else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
  else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
  else if (userAgent.includes('Opera')) deviceInfo.browser = 'Opera';

  // Detect OS
  if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
  else if (userAgent.includes('Mac OS')) deviceInfo.os = 'macOS';
  else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
  else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    deviceInfo.os = 'iOS';
  }

  // Detect device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceInfo.device = 'Mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceInfo.device = 'Tablet';
  }

  return deviceInfo;
};

