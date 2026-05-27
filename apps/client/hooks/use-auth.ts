import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setTokens, clearTokens } from "@/lib/api/baseQuery";

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    name: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string;
  refreshToken: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const AUTH_STORAGE_KEY = "auth-storage";

const getInitialAuthState = () => {
  if (typeof window === "undefined") {
    return {
      user: null as User | null,
      accessToken: "",
      refreshToken: "",
      isAuthenticated: false,
      isLoading: true, // Indicate loading state during SSR
    };
  }

  // For client-side, we'll check localStorage immediately in the persist middleware
  // Return a loading state initially
  return {
    user: null as User | null,
    accessToken: "",
    refreshToken: "",
    isAuthenticated: false,
    isLoading: true, // Indicate loading state while checking localStorage
  };
};

const initialAuth = getInitialAuthState();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: initialAuth.user,
      accessToken: initialAuth.accessToken,
      refreshToken: initialAuth.refreshToken,
      isAuthenticated: initialAuth.isAuthenticated,
      isLoading: false,
      setAuth: (user, accessToken, refreshToken) => {
        setTokens(accessToken, refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },
      logout: () => {
        clearTokens();
        set({
          user: null,
          accessToken: "",
          refreshToken: "",
          isAuthenticated: false,
          isLoading: false,
        });
      },
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.accessToken && state.refreshToken && state.isAuthenticated) {
          setTokens(state.accessToken, state.refreshToken);
        } else {
          clearTokens();
        }

        state.setLoading(false);
      },
    }
  )
);
