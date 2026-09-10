// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

const toStudentPayload = (form) => ({
  name: form.name,
  phone: form.phone,
  gender: form.gender,
  libraryId: form.libraryId,
  usn: form.usn,
  academicYear: form.academicYear,
  programId: form.programId,
  departmentId: form.departmentId,
  semester: form.semester,
  sectionId: form.sectionId,
});

export const fetchStudents = async (filters = {}) => {
  const response = await axiosInstance.get('/students/list', { params: filters });
  return response; // { data: [...], meta: {...} } (unwrapped by interceptor down to response.data)
};

export const fetchStudentById = async (id) => {
  const response = await axiosInstance.get(`/students/${id}`);
  return response.data;
};

export const createStudent = async (form) => {
  const response = await axiosInstance.post('/students', toStudentPayload(form));
  return response.data;
};

export const updateStudent = async (id, form) => {
  const response = await axiosInstance.put(`/students/${id}`, toStudentPayload(form));
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await axiosInstance.delete(`/students/${id}`);
  return response.data;
};
