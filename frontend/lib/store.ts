/**
 * Zustand store — cart state management.
 */

import { create } from "zustand";
import api from "@/lib/api";
import type { Cart, CartItem } from "@/types";

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearError: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  error: null,

  fetchCart: async () => {
    try {
      set({ loading: true, error: null });
      const { data } = await api.get<Cart>("/cart");
      set({ cart: data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.detail || "Failed to fetch cart" });
    }
  },

  addToCart: async (productId: string, quantity = 1) => {
    try {
      set({ loading: true, error: null });
      const { data } = await api.post<Cart>("/cart/items", {
        product_id: productId,
        quantity,
      });
      set({ cart: data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.detail || "Failed to add to cart" });
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    try {
      set({ loading: true, error: null });
      const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity });
      set({ cart: data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.detail || "Failed to update cart" });
    }
  },

  removeItem: async (itemId: string) => {
    try {
      set({ loading: true, error: null });
      const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
      set({ cart: data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.detail || "Failed to remove item" });
    }
  },

  clearError: () => set({ error: null }),
}));

// ── Auth store ───────────────────────────────────────────────────
interface AuthState {
  token: string | null;
  user: import("@/types").UserProfile | null;
  loading: boolean;

  setToken: (token: string) => void;
  fetchUser: () => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  user: null,
  loading: false,

  setToken: (token: string) => {
    localStorage.setItem("access_token", token);
    set({ token });
  },

  fetchUser: async () => {
    try {
      set({ loading: true });
      const { data } = await api.get("/auth/me");
      set({ user: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ token: null, user: null });
    window.location.href = "/login";
  },

  isAuthenticated: () => !!get().token,
}));
