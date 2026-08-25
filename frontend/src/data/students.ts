// Offline fallback data — mirrors the seeded DB records exactly
export interface Student {
  id: number;
  usn: string;
  name: string;
  email?: string;
  phone?: string;
  semester?: number | string;
  section?: string;
  status?: string;
  counsellor?: string;
}

const students: Student[] = [
  { id: 1,  usn: '1VE23CS001', name: 'Aarav Sharma',   email: '1ve23cs001@college.edu', phone: '9876543001', semester: 3, section: 'A', status: 'Active' },
  { id: 2,  usn: '1VE23CS002', name: 'Bhavya Reddy',   email: '1ve23cs002@college.edu', phone: '9876543002', semester: 3, section: 'A', status: 'Active' },
  { id: 3,  usn: '1VE23CS003', name: 'Charan Kumar',   email: '1ve23cs003@college.edu', phone: '9876543003', semester: 3, section: 'A', status: 'Active' },
  { id: 4,  usn: '1VE23CS004', name: 'Deepika Nair',   email: '1ve23cs004@college.edu', phone: '9876543004', semester: 3, section: 'A', status: 'Active' },
  { id: 5,  usn: '1VE23CS005', name: 'Eshan Mehta',    email: '1ve23cs005@college.edu', phone: '9876543005', semester: 3, section: 'A', status: 'Active' },
  { id: 6,  usn: '1VE23CS006', name: 'Fathima Zahra',  email: '1ve23cs006@college.edu', phone: '9876543006', semester: 3, section: 'A', status: 'Active' },
  { id: 7,  usn: '1VE23CS007', name: 'Ganesh Prasad',  email: '1ve23cs007@college.edu', phone: '9876543007', semester: 3, section: 'A', status: 'Active' },
  { id: 8,  usn: '1VE23CS008', name: 'Harini Suresh',  email: '1ve23cs008@college.edu', phone: '9876543008', semester: 3, section: 'A', status: 'Active' },
  { id: 9,  usn: '1VE23CS009', name: 'Ishaan Verma',   email: '1ve23cs009@college.edu', phone: '9876543009', semester: 3, section: 'A', status: 'Active' },
  { id: 10, usn: '1VE23CS010', name: 'Jyothi Prakash', email: '1ve23cs010@college.edu', phone: '9876543010', semester: 3, section: 'A', status: 'Active' },
];

export default students;
