const DEFAULT_API_URL = "http://localhost:5000";
const API_PREFIX = "/api/v1";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

export const API_URL = (() => {
  const configuredUrl = trimTrailingSlashes(
    process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  );

  return configuredUrl.endsWith(API_PREFIX)
    ? configuredUrl
    : `${configuredUrl}${API_PREFIX}`;
})();

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
};
