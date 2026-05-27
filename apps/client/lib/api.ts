import { setTokens, clearTokens, getAccessToken, getRefreshToken, axiosInstance } from "./api/baseQuery";

// Re-export from baseQuery for backward compatibility
export { setTokens, clearTokens, getAccessToken, getRefreshToken };
export default axiosInstance;
