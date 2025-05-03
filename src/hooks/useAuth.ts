'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import * as authService from '@/services/authService';
import type { LoginFormValues, RegisterFormValues } from '@/lib/validation/auth';
import { useToast } from './use-toast';

// Define types based on backend responses
interface User {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean; // Derived state for easier checks
  login: (credentials: LoginFormValues) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: RegisterFormValues) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for token management
const storeTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Also set as cookie for middleware access
    document.cookie = `accessToken=${accessToken}; path=/; SameSite=Lax; Max-Age=900`; // Max-Age=15 minutes
    document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Lax; Max-Age=604800`; // Max-Age=7 days
  }
};

const removeTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Also remove cookies
    document.cookie = 'accessToken=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'refreshToken=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }
};

const getAccessToken = (): string | null => {
  // Prefer localStorage for client-side access, but could check cookies as fallback
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
};

const getRefreshToken = (): string | null => {
   return typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (token: string): Promise<User | null> => {
    try {
      const profileData = await authService.getMe(token);
      return profileData;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      // Token might be expired or invalid
      // Don't remove tokens here, let the refresh logic handle it
      return null;
    }
  }, []);

  // Function to read cookie
    const getCookie = (name: string): string | null => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

  // Check authentication status on mount and potentially refresh token
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      let currentToken = getAccessToken(); // Prefer localStorage
      let refreshToken = getRefreshToken();
      let profileData: User | null = null;

       // If localStorage is empty, check cookies (e.g., after page refresh before client hydration)
      if (!currentToken) {
          currentToken = getCookie('accessToken');
      }
       if (!refreshToken) {
          refreshToken = getCookie('refreshToken');
       }


      if (currentToken) {
        profileData = await fetchUserProfile(currentToken);
      }

      // If profile fetch failed (e.g., token expired) and we have a refresh token, try refreshing
      if (!profileData && refreshToken) {
         console.log("Access token invalid or missing, attempting refresh...");
        try {
          const { accessToken: newAccessToken } = await authService.refreshAccessToken(refreshToken);
          storeTokens(newAccessToken, refreshToken); // Store new access token (localStorage + cookie)
          console.log("Token refreshed successfully.");
          currentToken = newAccessToken;
          profileData = await fetchUserProfile(currentToken); // Fetch profile with new token
        } catch (refreshError) {
           console.error("Failed to refresh token:", refreshError);
           removeTokens(); // Clear tokens if refresh fails
        }
      } else if (!profileData && !refreshToken) {
          // If no profile, no access token, and no refresh token, definitely logged out
          removeTokens();
      }


      setUser(profileData);
      setIsLoading(false);
    };

    checkAuthStatus();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const login = async (credentials: LoginFormValues): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { user: loggedInUser, accessToken, refreshToken } = await authService.login(credentials);
      storeTokens(accessToken, refreshToken);
      setUser(loggedInUser);
      toast({ title: 'Login Successful', description: `Welcome back, ${loggedInUser.name || loggedInUser.email}!` });
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({ title: 'Login Failed', description: error.message || 'Please check your credentials.', variant: 'destructive' });
      setUser(null);
      removeTokens();
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
          await authService.logout(refreshToken); // Invalidate token on backend
          console.log("Backend logout successful");
      }
    } catch (error) {
        console.error("Backend logout failed (token might already be invalid):", error);
        // Proceed with client-side logout anyway
    } finally {
        setUser(null);
        removeTokens(); // Remove tokens from client (localStorage + cookies)
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/'); // Redirect to home page after logout
        setIsLoading(false);
    }
  };

  const register = async (userData: RegisterFormValues): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Backend register currently auto-logs in, returning tokens
      const { user: registeredUser, accessToken, refreshToken } = await authService.register(userData);
      storeTokens(accessToken, refreshToken);
      setUser(registeredUser);
      toast({ title: 'Registration Successful', description: `Welcome, ${registeredUser.name || registeredUser.email}!` });
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast({ title: 'Registration Failed', description: error.message || 'Please try again.', variant: 'destructive' });
      setUser(null);
      removeTokens();
      setIsLoading(false);
      return false;
    }
  };

  const isAuthenticated = !!user; // User is authenticated if user object is not null

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
  };

  // Render children regardless of loading state
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
