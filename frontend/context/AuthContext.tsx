'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kmxjx8sunf.execute-api.us-east-1.amazonaws.com';

const ACCESS_TOKEN_KEY = 'cognito_access_token';
const ID_TOKEN_KEY = 'cognito_id_token';
const REFRESH_TOKEN_KEY = 'cognito_refresh_token';
const USER_DATA_KEY = 'user_data';

interface UserData {
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  tokens: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
  };
  [key: string]: unknown;
}

interface AuthContextType {
  accessToken: string | null;
  currentUser: UserData | null;
  isLoggedIn: boolean;
  signupEmail: string | null;
  setSignupEmail: (email: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  sendOTP: (name: string, email: string, phone: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  authenticatedFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: string }[]>([]);
  const notifIdRef = useRef(0);

  // Initialize auth from sessionStorage
  useEffect(() => {
    const storedAccessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const storedIdToken = sessionStorage.getItem(ID_TOKEN_KEY);
    const storedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_DATA_KEY);

    if (storedAccessToken && storedUser) {
      setAccessToken(storedAccessToken);
      setIdToken(storedIdToken);
      setRefreshToken(storedRefreshToken);
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const storeAuthData = useCallback((tokens: { accessToken: string; idToken: string; refreshToken: string }, userData: UserData) => {
    setAccessToken(tokens.accessToken);
    setIdToken(tokens.idToken);
    setRefreshToken(tokens.refreshToken);
    setCurrentUser(userData);

    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    sessionStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  }, []);

  const clearAuthData = useCallback(() => {
    setAccessToken(null);
    setIdToken(null);
    setRefreshToken(null);
    setCurrentUser(null);

    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_DATA_KEY);
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3300);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!refreshToken) return false;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      if (!response.ok) return false;

      setAccessToken(data.data.tokens.accessToken);
      setIdToken(data.data.tokens.idToken);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, data.data.tokens.accessToken);
      sessionStorage.setItem(ID_TOKEN_KEY, data.data.tokens.idToken);
      return true;
    } catch {
      return false;
    }
  }, [refreshToken]);

  const authenticatedFetch = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401 && accessToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      } else {
        clearAuthData();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }, [accessToken, refreshAccessToken, clearAuthData]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    storeAuthData(data.data.tokens, data.data);
    showNotification('Welcome back!', 'success');
  }, [storeAuthData, showNotification]);

  const logout = useCallback(() => {
    clearAuthData();
    showNotification('Logged out successfully', 'success');
  }, [clearAuthData, showNotification]);

  const sendOTP = useCallback(async (name: string, email: string, phone: string) => {
    let formattedPhone = phone;
    if (phone) {
      formattedPhone = phone.replace(/\D/g, '');
      formattedPhone = formattedPhone.length === 10 ? `+1${formattedPhone}` : `+${formattedPhone}`;
    }

    const response = await fetch(`${API_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone: formattedPhone || null }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    setSignupEmail(email);
    showNotification(`Verification code sent to ${email}`, 'success');
  }, [showNotification]);

  const verifyOTP = useCallback(async (otp: string) => {
    if (!signupEmail) {
      throw new Error('Email information lost. Please start over.');
    }

    const response = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupEmail, otp }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }

    showNotification('Email verified! Now set your password', 'success');
  }, [signupEmail, showNotification]);

  const resendOTP = useCallback(async () => {
    if (!signupEmail) {
      throw new Error('Email information lost. Please start over.');
    }

    const response = await fetch(`${API_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupEmail }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to resend OTP');
    }

    showNotification('New verification code sent to your email', 'success');
  }, [signupEmail, showNotification]);

  const setPasswordFn = useCallback(async (password: string) => {
    if (!signupEmail) {
      throw new Error('Email information lost. Please start over.');
    }

    const response = await fetch(`${API_URL}/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupEmail, newPassword: password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to set password');
    }

    // Auto-login
    try {
      await login(signupEmail, password);
      setSignupEmail(null);
      showNotification('Account created and logged in successfully!', 'success');
    } catch {
      showNotification('Account created! Please log in with your new password.', 'info');
      throw new Error('AUTO_LOGIN_FAILED');
    }
  }, [signupEmail, login, showNotification]);

  const value: AuthContextType = {
    accessToken,
    currentUser,
    isLoggedIn: !!accessToken && !!currentUser,
    signupEmail,
    setSignupEmail,
    login,
    logout,
    sendOTP,
    verifyOTP,
    resendOTP,
    setPassword: setPasswordFn,
    authenticatedFetch,
    showNotification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Notification portal */}
      <div id="notification-container">
        {notifications.map(n => (
          <div key={n.id} className={`notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}
