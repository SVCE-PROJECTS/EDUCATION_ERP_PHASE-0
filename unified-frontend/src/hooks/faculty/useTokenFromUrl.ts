/**
 * useTokenFromUrl
 * On web: reads ?token= from the URL, fetches /api/auth/me to get the user
 * profile, then injects the session into AuthContext via login().
 * Cleans the token out of the URL bar after consuming it.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../../context/faculty/AuthContext';
import api from '../../services/faculty/api';

export function useTokenFromUrl() {
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    // Remove token from URL bar immediately
    window.history.replaceState({}, '', window.location.pathname);

    api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res: any) => {
        const user = res.data?.data ?? res.data ?? res;
        const authUser = {
          id:             user.id,
          name:           user.name ?? user.fullName ?? user.username,
          username:       user.username,
          email:          user.email ?? '',
          designation:    user.designation ?? '',
          department:     user.department ?? { id: '', name: '', code: user.departmentCode ?? '' },
          departmentCode: user.departmentCode ?? user.department?.code ?? '',
          isHOD:          user.isHOD ?? user.is_hod ?? false,
          roles:          user.roles ?? [],
          profilePhoto:   user.profilePhoto ?? null,
        };
        login(authUser as any, token);
      })
      .catch(() => {
        // Token invalid — stay on login screen
      });
  }, []);
}
