export type LOGIN_REQUEST = {
  emailOrMobile: string;
  password: string;
};

export type LOGIN_RESPONSE = {
  message: string;
  data: {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  };
};

export type REGISTER_REQUEST = {
  email: string;
  mobile: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
};

export type REGISTER_RESPONSE = {
  message: string;
  data: {
    user: UserResponse;
  };
};

export type GOOGLE_LOGIN_REQUEST = {
  token: string;
};

export type GOOGLE_LOGIN_RESPONSE = {
  message: string;
  data: {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  };
};

export type SEND_OTP_REQUEST = {
  emailOrMobile: string;
};

export type SEND_OTP_RESPONSE = {
  message: string;
  data: null;
};

export type VERIFY_OTP_LOGIN_REQUEST = {
  emailOrMobile: string;
  otp: string;
};

export type VERIFY_OTP_LOGIN_RESPONSE = {
  message: string;
  data: {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  };
};

export type REFRESH_TOKEN_REQUEST = {
  refreshToken: string;
};

export type REFRESH_TOKEN_RESPONSE = {
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
};

export type LOGOUT_RESPONSE = {
  message: string;
  data: null;
};

export type FORGOT_PASSWORD_REQUEST = {
  email: string;
};

export type FORGOT_PASSWORD_RESPONSE = {
  message: string;
  data: null;
};

export type RESET_PASSWORD_REQUEST = {
  token: string;
  newPassword: string;
};

export type RESET_PASSWORD_RESPONSE = {
  message: string;
  data: null;
};

export type CHANGE_PASSWORD_REQUEST = {
  currentPassword: string;
  newPassword: string;
};

export type CHANGE_PASSWORD_RESPONSE = {
  message: string;
  data: null;
};

export type GET_PROFILE_RESPONSE = {
  message: string;
  data: {
    user: UserResponse;
  };
};

export type UserResponse = {
  _id: string;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  role: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};