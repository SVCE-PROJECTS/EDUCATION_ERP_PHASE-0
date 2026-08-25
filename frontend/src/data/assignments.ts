// Offline fallback assignments — mirrors seeded DB records
import { Assignment } from '../types';

const assignments: Assignment[] = [
  { id: 1, title: 'Data Structures Lab Report',  subject: 'Data Structures',   semester: '3', dueDate: '2026-08-10', marks: 20, status: 'Open'   },
  { id: 2, title: 'ER Diagram Assignment',        subject: 'DBMS',              semester: '3', dueDate: '2026-08-15', marks: 15, status: 'Open'   },
  { id: 3, title: 'Network Topology Project',     subject: 'Computer Networks', semester: '3', dueDate: '2026-08-20', marks: 25, status: 'Open'   },
  { id: 4, title: 'Process Scheduling Report',    subject: 'Operating Systems', semester: '3', dueDate: '2026-07-30', marks: 20, status: 'Closed' },
  { id: 5, title: 'Java OOP Mini Project',        subject: 'Java Programming',  semester: '3', dueDate: '2026-08-25', marks: 30, status: 'Open'   },
];

export type { Assignment };
export default assignments;
