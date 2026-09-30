import api from './api';

export interface AcademicOption {
  id: string | number;
  name: string;
}

export interface AcademicFacultyOption extends AcademicOption {
  employeeId: string;
  designation: string;
}

export interface AcademicSubject {
  id: string | number;
  subjectCode: string;
  subjectName: string;
  credits: number | null;
  programId: string | number;
  semesterId: string | number;
}

export interface AcademicClass {
  id: string | number;
  semesterId: string | number;
  semesterNumber: number;
  sectionId: string | number;
  sectionName: string;
  subjectId: string | number;
  subjectCode: string;
  subjectName: string;
  facultyId: string | number;
  facultyName: string;
  facultyEmployeeId: string;
  academicYear: string;
}

export interface AcademicOptions {
  semesterId: string | number;
  semesterNumber: number;
  academicYear: string;
  programs: AcademicOption[];
  sections: Array<AcademicOption & { name: string }>;
  faculty: AcademicFacultyOption[];
  subjects: AcademicSubject[];
}

const academicService = {
  async getOptions(semesterNumber: number): Promise<AcademicOptions> {
    const response = await api.get(`/hod/academic/options/${semesterNumber}`);
    return response.data.data;
  },

  async getClasses(semesterNumber?: number, sectionId?: string | number): Promise<AcademicClass[]> {
    const response = await api.get('/hod/academic/classes', { params: { semesterNumber, sectionId } });
    return response.data.data;
  },

  async createSubject(payload: {
    subjectCode: string;
    subjectName: string;
    credits: number | null;
    programId: string;
    semesterNumber: number;
  }) {
    const response = await api.post('/hod/academic/subjects', payload);
    return response.data.data;
  },

  async createClass(payload: {
    semesterNumber: number;
    sectionId: string | number;
    subjectId: string;
    facultyId: string;
    academicYear: string;
  }) {
    const response = await api.post('/hod/academic/classes', payload);
    return response.data.data;
  },

  async deleteClass(classId: string | number) {
    const response = await api.delete(`/hod/academic/classes/${classId}`);
    return response.data.data;
  },

  async getTimetable(semesterNumber: number, sectionId: string | number) {
    const response = await api.get('/hod/academic/timetable', { params: { semesterNumber, sectionId } });
    return response.data.data;
  },

  async createTimetable(payload: {
    classId: string;
    dayOfWeek: string;
    period: number;
    roomNumber: string;
  }) {
    const response = await api.post('/hod/academic/timetable', payload);
    return response.data.data;
  },

  async deleteTimetable(timetableId: string | number) {
    const response = await api.delete(`/hod/academic/timetable/${timetableId}`);
    return response.data.data;
  },
};

export default academicService;