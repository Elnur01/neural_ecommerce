/**
 * API Client — Axios wrapper with auth token injection.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach JWT if available ─────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: handle 401 globally ────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      // Redirect to login if not already there
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/onboarding")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
