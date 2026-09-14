// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

const toFacultyPayload = (form) => ({
  employeeId:     form.employeeId,
  name:           form.name,
  email:          form.email,
  phone:          form.phone,
  gender:         form.gender,
  designation:    form.designation,
  qualification:  form.qualification,
  specialization: form.specialization,
  experienceYears: form.experienceYears,
  departmentId:   form.departmentId,
  joiningDate:    form.joiningDate,
  status:         form.status,
  username:       form.username,
  password:       form.password,
});

export const fetchFaculty = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/faculty', { params: filters });
  return response; // { data: [...], meta: {...} }
};

export const fetchFacultyById = async (id) => {
  const response = await axiosInstance.get(`/admin/faculty/${id}`);
  return response.data;
};

export const createFaculty = async (form) => {
  const response = await axiosInstance.post('/admin/faculty', toFacultyPayload(form));
  return response.data;
};

export const updateFaculty = async (id, form) => {
  const response = await axiosInstance.put(`/admin/faculty/${id}`, toFacultyPayload(form));
  return response.data;
};

export const deleteFaculty = async (id) => {
  const response = await axiosInstance.delete(`/admin/faculty/${id}`);
  return response.data;
};
