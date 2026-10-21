import axios from "axios";

/**
 * Normalizes the base API URL by stripping all trailing slashes.
 * e.g., "https://veles-56q0.onrender.com/" -> "https://veles-56q0.onrender.com"
 * e.g., "http://localhost:3000" -> "http://localhost:3000"
 */
const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
export const API_URL = API_BASE_URL;

/**
 * Normalizes an endpoint path ensuring it starts with a single leading slash
 * and has no leading duplicate slashes.
 * e.g., "posts" -> "/posts"
 * e.g., "/posts" -> "/posts"
 * e.g., "//posts" -> "/posts"
 */
export const normalizeEndpoint = (endpoint = "") => {
  if (!endpoint) return "";
  const cleaned = endpoint.replace(/^\/+/, "/");
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
};

/**
 * Normalizes a URL pathname so consecutive slashes in the path are collapsed to one,
 * while preserving the protocol (http:// or https://) and query parameters/fragments.
 * e.g., "https://veles-56q0.onrender.com//posts?featured=true"
 *    -> "https://veles-56q0.onrender.com/posts?featured=true"
 */
export const normalizeUrlPath = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return urlStr;
  if (/^https?:\/\//i.test(urlStr)) {
    try {
      const parsed = new URL(urlStr);
      parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
      return parsed.toString();
    } catch {
      return urlStr.replace(/([^:])\/{2,}/g, "$1/");
    }
  }
  return normalizeEndpoint(urlStr);
};

/**
 * Constructs a fully normalized API URL joining the base URL and endpoint with exactly one slash.
 * Handles:
 * - base URL ending with / or not
 * - endpoint starting with /, //, or without slash
 * - full absolute URLs with double slashes
 * - query strings and URL parameters
 *
 * Examples:
 *   buildApiUrl("/posts") -> "https://veles-56q0.onrender.com/posts"
 *   buildApiUrl("posts?page=1&limit=10") -> "https://veles-56q0.onrender.com/posts?page=1&limit=10"
 *   buildApiUrl("//posts?featured=true") -> "https://veles-56q0.onrender.com/posts?featured=true"
 */
export const buildApiUrl = (endpoint = "") => {
  if (!endpoint) return API_BASE_URL;

  if (/^https?:\/\//i.test(endpoint)) {
    return normalizeUrlPath(endpoint);
  }

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint.replace(/^\/+/, "/")
    : `/${endpoint}`;

  return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Axios instance configured with normalized baseURL.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Normalize request URLs in apiClient
apiClient.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeUrlPath(config.url);
  }
  return config;
});

// Safety net: Also install request interceptor on the global axios instance
// to catch and normalize any direct axios calls containing duplicate slashes.
axios.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeUrlPath(config.url);
  }
  return config;
});

export default apiClient;

