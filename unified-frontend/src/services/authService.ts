import axiosInstance from '../api/axiosInstance';

export type UserRole = 'admin' | 'hod' | 'faculty';

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  name?: string;
  role: UserRole;
  departmentCode?: string;
  isHOD?: boolean;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

// ── Admin login ───────────────────────────────────────────────────────────────
// POST /api/auth/login  { username, password }
// Response shape (admin): { success, data: { token, user } }
export const adminLogin = async (
  username: string,
  password: string,
): Promise<AuthResult> => {
  const res: any = await axiosInstance.post('/auth/login', { username, password });
  // axiosInstance returns response.data (the full body)
  // admin uses success() → { success: true, data: { token, user } }
  const payload = res?.data ?? res;
  return {
    token: payload.token,
    user: { ...payload.user, role: 'admin' },
  };
};

// ── Faculty / HOD login ───────────────────────────────────────────────────────
// POST /api/auth/faculty/login  { departmentCode, username, password }
// Response shape (faculty): { success, message, data: { token, faculty, isHOD }, timestamp }
export const facultyLogin = async (
  departmentCode: string,
  username: string,
  password: string,
  expectHOD = false,
): Promise<AuthResult> => {
  const res: any = await axiosInstance.post('/auth/faculty/login', {
    departmentCode,
    username,
    password,
  });
  // faculty uses successResponse() → { success, message, data: { token, faculty, isHOD }, timestamp }
  const payload = res?.data ?? res;
  const token: string = payload.token;
  const faculty: any = payload.faculty ?? payload.user ?? payload;
  const isHOD: boolean = payload.isHOD ?? faculty?.is_hod ?? false;

  if (expectHOD && !isHOD) {
    throw { message: 'Access denied. This account does not have HOD privileges.' };
  }

  const role: UserRole = isHOD ? 'hod' : 'faculty';

  return {
    token,
    user: {
      id: faculty.id,
      username: faculty.username ?? username,
      fullName: faculty.name ?? faculty.fullName,
      name: faculty.name ?? faculty.fullName,
      role,
      departmentCode: faculty.department?.code ?? faculty.departmentCode ?? departmentCode,
      isHOD,
    },
  };
};
