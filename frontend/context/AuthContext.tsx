'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import '@/lib/amplify-config';
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp,
  signOut as amplifySignOut,
  resendSignUpCode,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
} from 'aws-amplify/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kmxjx8sunf.execute-api.us-east-1.amazonaws.com';

interface UserData {
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
}

interface AuthContextType {
  accessToken: string | null;
  currentUser: UserData | null;
  isLoggedIn: boolean;
  authLoading: boolean;
  signupEmail: string | null;
  setSignupEmail: (email: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
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
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [signupPassword, setSignupPassword] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: string }[]>([]);
  const notifIdRef = useRef(0);

  // Helper to load user data from Amplify session
  const loadUserSession = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString() || null;

      const nameParts = (attributes.name || '').split(' ');
      setCurrentUser({
        email: attributes.email || '',
        firstName: nameParts[0] || undefined,
        lastName: nameParts.slice(1).join(' ') || undefined,
        userId: user.userId,
      });
      setAccessToken(token);
    } catch {
      // Not signed in – clear state
      setCurrentUser(null);
      setAccessToken(null);
    }
  }, []);

  // On mount: check if user is already signed in (Amplify stores tokens in localStorage)
  useEffect(() => {
    loadUserSession().finally(() => setAuthLoading(false));
  }, [loadUserSession]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3300);
  }, []);

  // ─── authenticatedFetch ────────────────────────────────────────────
  // Amplify handles token refresh automatically via fetchAuthSession().
  const authenticatedFetch = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        setAccessToken(token); // keep state in sync
      }
    } catch {
      setCurrentUser(null);
      setAccessToken(null);
      throw new Error('Session expired. Please login again.');
    }

    return fetch(`${API_URL}${endpoint}`, { ...options, headers });
  }, []);

  // ─── login ─────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const result = await amplifySignIn({ username: email, password });

    if (result.isSignedIn) {
      await loadUserSession();
      showNotification('Welcome back!', 'success');
    } else {
      throw new Error('Login was not completed. Please try again.');
    }
  }, [loadUserSession, showNotification]);

  // ─── logout ────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await amplifySignOut();
    setCurrentUser(null);
    setAccessToken(null);
    showNotification('Logged out successfully', 'success');
  }, [showNotification]);

  // ─── signup (replaces sendOTP) ─────────────────────────────────────
  // Calls Cognito signUp which creates user in UNCONFIRMED state and
  // automatically sends a verification code to the user's email.
  const signup = useCallback(async (name: string, email: string, phone: string, password: string) => {
    let formattedPhone = phone;
    if (phone) {
      formattedPhone = phone.replace(/\D/g, '');
      formattedPhone = formattedPhone.length === 10 ? `+1${formattedPhone}` : `+${formattedPhone}`;
    }

    await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
          ...(formattedPhone ? { phone_number: formattedPhone } : {}),
        },
      },
    });

    setSignupEmail(email);
    setSignupPassword(password); // keep for auto-login after OTP
    showNotification(`Verification code sent to ${email}`, 'success');
  }, [showNotification]);

  // ─── verifyOTP ─────────────────────────────────────────────────────
  // Confirms the signup with the code, then auto-logs-in.
  const verifyOTP = useCallback(async (otp: string) => {
    if (!signupEmail) {
      throw new Error('Email information lost. Please start over.');
    }

    await confirmSignUp({ username: signupEmail, confirmationCode: otp });

    // Auto-login after confirmation
    if (signupPassword) {
      try {
        await amplifySignIn({ username: signupEmail, password: signupPassword });
        await loadUserSession();
        setSignupEmail(null);
        setSignupPassword(null);
        showNotification('Account created and logged in successfully!', 'success');
      } catch {
        showNotification('Account created! Please log in with your password.', 'info');
        setSignupEmail(null);
        setSignupPassword(null);
        throw new Error('AUTO_LOGIN_FAILED');
      }
    }
  }, [signupEmail, signupPassword, loadUserSession, showNotification]);

  // ─── resendOTP ─────────────────────────────────────────────────────
  const resendOTP = useCallback(async () => {
    if (!signupEmail) {
      throw new Error('Email information lost. Please start over.');
    }

    await resendSignUpCode({ username: signupEmail });
    showNotification('New verification code sent to your email', 'success');
  }, [signupEmail, showNotification]);

  const value: AuthContextType = {
    accessToken,
    currentUser,
    isLoggedIn: !!accessToken && !!currentUser,
    authLoading,
    signupEmail,
    setSignupEmail,
    login,
    logout,
    signup,
    verifyOTP,
    resendOTP,
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
