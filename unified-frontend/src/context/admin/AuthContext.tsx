import React, {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { loginRequest } from '../../services/admin/authService';
import { setToken as setAxiosToken, setLogoutHandler } from '../../api/tokenStore';
import axiosInstance from '../../api/axiosInstance';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false); // true once the stored session has been checked
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Restore persisted session OR auto-login from ?token= URL param (web only)
  useEffect(() => {
    (async () => {
      try {
        // ── Web: check for ?token= from unified-frontend ──────────────────
        if (Platform.OS === 'web') {
          const params = new URLSearchParams(window.location.search);
          const urlToken = params.get('token');
          if (urlToken) {
            window.history.replaceState({}, '', window.location.pathname);
            try {
              setAxiosToken(urlToken);
              const res: any = await axiosInstance.get('/auth/me');
              const u = res.data ?? res;
              await AsyncStorage.setItem(TOKEN_KEY, urlToken);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
              setAxiosToken(urlToken);
              setUser(u);
              return;
            } catch {
              setAxiosToken(null);
              // fall through to normal restore
            }
          }
        }
        // ── Restore persisted session ─────────────────────────────────────
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setAxiosToken(storedToken);
          // Validate the stored token before trusting it
          try {
            const res: any = await axiosInstance.get('/auth/me');
            const validatedUser = res.data ?? res;
            // Token is valid, use the validated user data
            setUser(validatedUser);
            // Update stored user in case server returned fresher data
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(validatedUser));
          } catch (validationError) {
            // Token is stale/invalid — clear it and force re-login
            console.warn('Stored token validation failed, clearing session:', validationError);
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
            setAxiosToken(null);
            setUser(null);
          }
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const login = async (username, password) => {
    setError(null);
    setIsLoggingIn(true);
    try {
      const { token, user: loggedInUser } = await loginRequest({ username, password });
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      setAxiosToken(token);
      setUser(loggedInUser);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setAxiosToken(null);
    setUser(null);
  };

  // Let axiosInstance's response interceptor trigger this logout on 401,
  // matching hod-portal/faculty-portal's session-expiry behavior. Re-registered
  // on every render so tokenStore always calls the latest closure.
  setLogoutHandler(logout);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isReady,
    isLoggingIn,
    error,
    login,
    logout,
  }), [user, isReady, isLoggingIn, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
