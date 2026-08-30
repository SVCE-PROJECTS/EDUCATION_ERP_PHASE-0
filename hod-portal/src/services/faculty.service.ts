import api from './api';

export interface FacultyListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: unknown;
}

export const facultyService = {
  getAll: async (params?: FacultyListParams) => {
    const res = await api.get('/faculty', {
      params,
    });

    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get(`/faculty/${id}`);
    return res.data;
  },

  create: async (formData: FormData) => {
    const res = await api.post('/faculty', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  },

  update: async (
    id: string,
    formData: FormData
  ) => {
    const res = await api.put(
      `/faculty/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(
      `/faculty/${id}`
    );

    return res.data;
  },
};

export const roleService = {
  getAll: async () => {
    const res = await api.get('/roles');
    return res.data;
  },

  getFacultyRoles: async (
    facultyId: string
  ) => {
    const res = await api.get(
      `/roles/faculty/${facultyId}/roles`
    );

    return res.data;
  },

  assign: async (
    facultyId: string,
    roleId: string
  ) => {
    const res = await api.post(
      `/roles/faculty/${facultyId}/roles`,
      { roleId }
    );

    return res.data;
  },

  remove: async (
    facultyId: string,
    roleId: string
  ) => {
    const res = await api.delete(
      `/roles/faculty/${facultyId}/roles/${roleId}`
    );

    return res.data;
  },

  sync: async (
    facultyId: string,
    {
      add,
      remove,
    }: {
      add: string[];
      remove: string[];
    }
  ) => {
    const res = await api.patch(
      `/roles/faculty/${facultyId}/roles/sync`,
      {
        add,
        remove,
      }
    );

    return res.data;
  },
};

export const dashboardService = {
  get: async () => {
    const res = await api.get('/dashboard');
    return res.data;
  },
};