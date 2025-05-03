'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
// Import user type and auth functions from services later

interface AuthContextType {
  user: any | null; // Replace 'any' with your User type
  isLoading: boolean;
  login: (/* credentials */) => Promise<void>; // Define parameters later
  logout: () => void;
  register: (/* userData */) => Promise<void>; // Define parameters later
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null); // Replace 'any'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Check for existing token (localStorage/cookie) and validate it
    // Fetch user profile if token is valid
    const checkAuth = async () => {
      setIsLoading(true);
      // Simulate checking token
      await new Promise(resolve => setTimeout(resolve, 500));
      // If valid: fetch user profile and setUser(profileData)
      // If invalid or no token: setUser(null)
      setUser(null); // Placeholder
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (/* credentials */) => {
    setIsLoading(true);
    // TODO: Call login API service
    console.log('Simulating login...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    // On success: store tokens, fetch profile, setUser(profileData)
    setUser({ name: 'Test User', email: 'test@example.com' }); // Placeholder
    setIsLoading(false);
  };

  const logout = () => {
    setIsLoading(true);
    // TODO: Call logout API (invalidate refresh token), remove local tokens
    console.log('Simulating logout...');
    setUser(null);
    // Remove tokens from storage
    setIsLoading(false);
  };

  const register = async (/* userData */) => {
     setIsLoading(true);
    // TODO: Call register API service
    console.log('Simulating registration...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Handle response, maybe auto-login or show success message
    setIsLoading(false);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
