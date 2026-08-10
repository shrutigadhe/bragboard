// ─────────────────────────────────────────────
// API Configuration Utility
// Provides a single centralized way to build API request URLs
// Reads the base URL from the REACT_APP_API_URL environment variable (.env file)
// Falls back to an empty string when running locally (proxy handles the routing via package.json)
// ─────────────────────────────────────────────

// Base URL for all API calls — set in .env as REACT_APP_API_URL for production
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * getApiUrl
 * Builds a full API URL by combining the base URL with a given endpoint path.
 * Ensures the endpoint always starts with a "/" to avoid malformed URLs.
 *
 * Usage:
 *   getApiUrl('/api/login')     → 'https://api.example.com/api/login'
 *   getApiUrl('api/login')      → 'https://api.example.com/api/login'
 */
export const getApiUrl = (endpoint) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
};

export default API_BASE_URL;
