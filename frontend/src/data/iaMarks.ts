// Offline fallback IA marks — mirrors seeded DB records
export interface IAMark {
  id: number;
  usn: string;
  name: string;
  ia1: number;
  ia2: number;
  ia3: number;
}

const iaMarks: IAMark[] = [
  { id: 1,  usn: '1VE23CS001', name: 'Aarav Sharma',   ia1: 18, ia2: 17, ia3: 19 },
  { id: 2,  usn: '1VE23CS002', name: 'Bhavya Reddy',   ia1: 15, ia2: 16, ia3: 14 },
  { id: 3,  usn: '1VE23CS003', name: 'Charan Kumar',   ia1: 20, ia2: 19, ia3: 18 },
  { id: 4,  usn: '1VE23CS004', name: 'Deepika Nair',   ia1: 12, ia2: 14, ia3: 13 },
  { id: 5,  usn: '1VE23CS005', name: 'Eshan Mehta',    ia1: 17, ia2: 18, ia3: 16 },
  { id: 6,  usn: '1VE23CS006', name: 'Fathima Zahra',  ia1: 19, ia2: 20, ia3: 18 },
  { id: 7,  usn: '1VE23CS007', name: 'Ganesh Prasad',  ia1: 11, ia2: 13, ia3: 12 },
  { id: 8,  usn: '1VE23CS008', name: 'Harini Suresh',  ia1: 16, ia2: 15, ia3: 17 },
  { id: 9,  usn: '1VE23CS009', name: 'Ishaan Verma',   ia1: 14, ia2: 16, ia3: 15 },
  { id: 10, usn: '1VE23CS010', name: 'Jyothi Prakash', ia1: 20, ia2: 20, ia3: 19 },
];

export default iaMarks;
