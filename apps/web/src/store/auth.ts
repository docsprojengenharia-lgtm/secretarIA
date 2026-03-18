'use client';

import { create } from 'zustand';
import type { User, Clinic } from '@/types';

interface AuthState {
  user: User | null;
  clinic: Clinic | null;
  isLoading: boolean;
  setAuth: (user: User, clinic: Clinic) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  clinic: null,
  isLoading: true,
  setAuth: (user, clinic) => set({ user, clinic, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, clinic: null, isLoading: false }),
}));
