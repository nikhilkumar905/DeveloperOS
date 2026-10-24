/**
 * Centralized API configuration for DeveloperOS frontend.
 * Set VITE_API_URL / VITE_CHAT_API_URL in your frontend/.env file to override the defaults.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6500';
export const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:6502';

/** Extract a human-readable message from an axios error (FastAPI puts it in `detail`). */
export const getErrorMessage = (err: any, fallback: string): string => {
  const data = err?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  if (typeof data?.message === 'string') return data.message;
  return fallback;
};

/** The backend stores naive UTC datetimes; without a zone suffix JS would parse them as local time. */
export const parseUtc = (iso: string): Date => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
