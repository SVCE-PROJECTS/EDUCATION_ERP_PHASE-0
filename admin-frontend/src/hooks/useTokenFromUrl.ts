/**
 * useTokenFromUrl
 * On web: reads ?token= from the URL, fetches /api/auth/me,
 * then injects the session so the admin portal skips its login screen.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { setToken as setAxiosToken } from '../api/tokenStore';

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

export function useTokenFromUrl() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    // Remove from URL bar immediately
    window.history.replaceState({}, '', window.location.pathname);

    // Inject token into axios so the /me call is authenticated
    setAxiosToken(token);

    axiosInstance.get('/auth/me')
      .then(async (res: any) => {
        const user = res.data ?? res;
        // Persist exactly the same way AuthContext.login() does
        await AsyncStorage.setItem(TOKEN_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        // Force a page reload so AuthContext re-reads from AsyncStorage
        // and the app boots straight into the dashboard
        window.location.reload();
      })
      .catch(() => {
        setAxiosToken(null);
      });
  }, []);
}
