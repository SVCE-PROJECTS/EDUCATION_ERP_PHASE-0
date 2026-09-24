// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

const toStaffPayload = (form) => ({
  employeeId:    form.employeeId,
  name:          form.name,
  email:         form.email,
  phone:         form.phone,
  gender:        form.gender,
  designation:   form.designation,
  departmentId:  form.departmentId,
  qualification: form.qualification,
  joiningDate:   form.joiningDate,
  status:        form.status,
});

export const fetchNonTeachingStaff = async (filters = {}) => {
  const response = await axiosInstance.get('/admin/non-teaching-staff', { params: filters });
  return response; // { data: [...], meta: {...} }
};

export const fetchNonTeachingStaffById = async (id) => {
  const response = await axiosInstance.get(`/admin/non-teaching-staff/${id}`);
  return response.data;
};

export const createNonTeachingStaff = async (form) => {
  const response = await axiosInstance.post('/admin/non-teaching-staff', toStaffPayload(form));
  return response.data;
};

export const updateNonTeachingStaff = async (id, form) => {
  const response = await axiosInstance.put(`/admin/non-teaching-staff/${id}`, toStaffPayload(form));
  return response.data;
};

export const deleteNonTeachingStaff = async (id) => {
  const response = await axiosInstance.delete(`/admin/non-teaching-staff/${id}`);
  return response.data;
};
