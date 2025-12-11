// lib/stores.ts
import { create } from 'zustand';

interface ModalStore {
  isCreateAccountOpen: boolean;
  setIsCreateAccountOpen: (isOpen: boolean) => void;
  isLoginOpen: boolean;
  setIsLoginOpen: (isOpen: boolean) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isCreateAccountOpen: false,
  setIsCreateAccountOpen: (isOpen) => set({ isCreateAccountOpen: isOpen }),
  isLoginOpen: false,
  setIsLoginOpen: (isOpen) => set({ isLoginOpen: isOpen }),
}));

// Simplified User interface - only what's needed for auth
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolID: string;
  schoolYear: string;
  section: string;
  role: string;
  profileImage?: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  updateProfileImage: (profileImage: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearAuth: () => set({ user: null, isLoading: false }),
  
  // Update user profile with partial data
  updateUserProfile: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null
  })),
  
  // Update profile image specifically
  updateProfileImage: (profileImage) => set((state) => ({
    user: state.user ? { ...state.user, profileImage } : null
  })),
}));