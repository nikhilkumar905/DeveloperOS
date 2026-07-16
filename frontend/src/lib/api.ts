/**
 * Centralized API configuration for DeveloperOS frontend.
 * Set VITE_API_URL in your frontend/.env file to override the default.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6500';
