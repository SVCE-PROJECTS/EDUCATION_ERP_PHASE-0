/**
 * timetable.ts — Single source of truth for the Bhaskara Sem 4 timetable.
 *
 * Both TodaysClasses and the Timetable screen import from here.
 * Period status is calculated using actual start AND end times,
 * so 2-hour labs stay "Ongoing" for their full duration.
 *
 * Staff reference codes and full names are also exported here.
 */

export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface Period {
  time:    string;   // "HH:MM–HH:MM"
  subject: string;
  teacher: string;   // staff code or ""
  room:    string;
  section: string;
}

// ── Staff reference ────────────────────────────────────────────────
// RTJ and RTH are two different initials that appear to map to the
// same person (Mrs. Ranjana Thakuria). Based on the timetable data:
//   RTH = teaches DBMS (theory)
//   RTJ = assigned to NSS/PT (Saturday activity supervision)
// Both entries are preserved for timetable accuracy.
// If they are confirmed to be two different people, update the names below.
export const STAFF: Record<string, string> = {
  RMA: 'Mr. Madhu R',
  PSU: 'Mr. Suresh P',
  RTH: 'Mrs. Ranjana Thakuria',   // DBMS theory teacher
  SKS: 'Mr. Srikanth S',
  LKS: 'Mr. Lokesh M',          // see also: authenticated user's name from AuthContext
  SBK: 'Mrs. Shobhana K',
  RTJ: 'Mrs. Ranjana Thakuria',   // NSS/PT supervisor (same person, different code in source)
  RKS: 'Mr. Rajkumar S',          // MCL lab co-teacher
};

// ── Full weekly timetable ──────────────────────────────────────────
export const TIMETABLE: Record<DayKey, Period[]> = {
  Mon: [
    { time: '08:45–09:45', subject: 'ADA',     teacher: 'RMA', room: 'L308',  section: 'B1+B2' },
    { time: '09:45–10:45', subject: 'DMS',     teacher: 'SKS', room: 'L308',  section: 'B1+B2' },
    { time: '10:45–11:00', subject: 'Break',   teacher: '',    room: '',       section: '' },
    { time: '11:00–13:00', subject: 'PL',      teacher: '',    room: 'Lab',    section: 'B1+B2' },
    { time: '13:00–13:45', subject: 'Lunch',   teacher: '',    room: '',       section: '' },
    { time: '13:45–14:45', subject: 'BCE',     teacher: 'SBK', room: 'L308',  section: 'B1+B2' },
    { time: '14:45–15:45', subject: 'DMS',     teacher: 'SKS', room: 'L308',  section: 'B1+B2' },
    { time: '15:45–16:15', subject: 'Skill/Counselling', teacher: '', room: '', section: '' },
  ],
  Tue: [
    { time: '08:45–09:45', subject: 'DBMS',    teacher: 'RTH', room: 'L308',  section: 'B1+B2' },
    { time: '09:45–10:45', subject: 'MC',      teacher: 'PSU', room: 'L308',  section: 'B1+B2' },
    { time: '10:45–11:00', subject: 'Break',   teacher: '',    room: '',       section: '' },
    { time: '11:00–12:00', subject: 'CODSL',   teacher: 'LKS', room: 'R312A', section: 'B1' },
    { time: '11:00–12:00', subject: 'ADA Lab', teacher: 'RMA/SKS', room: 'R312B', section: 'B2' },
    { time: '13:00–13:45', subject: 'Lunch',   teacher: '',    room: '',       section: '' },
    { time: '13:45–16:15', subject: 'PL',      teacher: '',    room: 'Lab',    section: 'B1+B2' },
    { time: '15:45–16:15', subject: 'Skill/Counselling', teacher: '', room: '', section: '' },
  ],
  Wed: [
    { time: '08:45–10:45', subject: 'PL',      teacher: '',    room: 'Lab',    section: 'B1+B2' },
    { time: '10:45–11:00', subject: 'Break',   teacher: '',    room: '',       section: '' },
    { time: '11:00–12:00', subject: 'UHV',     teacher: 'LKS', room: 'L308',  section: 'B1+B2' },
    { time: '12:00–13:00', subject: 'DMS',     teacher: 'SKS', room: 'L308',  section: 'B1+B2' },
    { time: '13:00–13:45', subject: 'Lunch',   teacher: '',    room: '',       section: '' },
    { time: '13:45–14:45', subject: 'DBMS',    teacher: 'RTH', room: 'L308',  section: 'B1+B2' },
    { time: '14:45–15:45', subject: 'GITS',    teacher: 'LKS', room: 'L308',  section: 'B1+B2' },
    { time: '15:45–16:15', subject: 'Skill/Counselling', teacher: '', room: '', section: '' },
  ],
  Thu: [
    { time: '08:45–09:45', subject: 'MC',      teacher: 'PSU', room: 'L308',  section: 'B1+B2' },
    { time: '09:45–10:45', subject: 'BCE',     teacher: 'SBK', room: 'L308',  section: 'B1+B2' },
    { time: '10:45–11:00', subject: 'Break',   teacher: '',    room: '',       section: '' },
    { time: '11:00–13:00', subject: 'PL',      teacher: '',    room: 'Lab',    section: 'B1+B2' },
    { time: '13:00–13:45', subject: 'Lunch',   teacher: '',    room: '',       section: '' },
    { time: '13:45–14:45', subject: 'ADA',     teacher: 'RMA', room: 'L308',  section: 'B1+B2' },
    { time: '14:45–15:45', subject: 'DBMS',    teacher: 'RTH', room: 'L308',  section: 'B1+B2' },
    { time: '15:45–16:15', subject: 'Skill/Counselling', teacher: '', room: '', section: '' },
  ],
  Fri: [
    { time: '08:45–09:45', subject: 'ADA',     teacher: 'RMA', room: 'L308',  section: 'B1+B2' },
    { time: '09:45–10:45', subject: 'MC',      teacher: 'PSU', room: 'L308',  section: 'B1+B2' },
    { time: '10:45–11:00', subject: 'Break',   teacher: '',    room: '',       section: '' },
    { time: '11:00–12:00', subject: 'MCL',     teacher: 'PSU/RKS', room: 'R312A', section: 'B1' },
    { time: '11:00–12:00', subject: 'DBMSL',   teacher: 'RTH/LKS', room: 'R312B', section: 'B2' },
    { time: '13:00–13:45', subject: 'Lunch',   teacher: '',    room: '',       section: '' },
    { time: '13:45–16:15', subject: 'PL',      teacher: '',    room: 'Lab',    section: 'B1+B2' },
    { time: '15:45–16:15', subject: 'Skill/Counselling', teacher: '', room: '', section: '' },
  ],
  Sat: [
    { time: '08:45–10:45', subject: 'CCA/ECA', teacher: '',    room: '',       section: '' },
    { time: '11:00–13:00', subject: 'Online Certification/Skill Enhancement', teacher: '', room: '', section: '' },
    { time: '13:45–16:15', subject: 'NSS/PT',  teacher: 'RTJ', room: '',       section: '' },
  ],
};

export const DAYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAY_FULL: Record<DayKey, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
};

export const JS_DAY_TO_KEY: Record<number, DayKey> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

export const BREAK_TYPES = new Set([
  'Break', 'Lunch', 'NSS/PT', 'CCA/ECA',
  'Skill/Counselling', 'Online Certification/Skill Enhancement',
]);

// ── Time parsing helpers ───────────────────────────────────────────

/**
 * Parse "HH:MM" → decimal hours  e.g. "10:45" → 10.75
 */
function parseHourMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

/**
 * Parse "HH:MM–HH:MM" into { start, end } in decimal hours.
 * Correctly handles 2-hour labs like "11:00–13:00".
 */
export function parsePeriodTimes(timeStr: string): { start: number; end: number } {
  const parts = timeStr.split('–');
  const start = parseHourMin(parts[0] ?? '00:00');
  const end   = parts[1] ? parseHourMin(parts[1]) : start + 1;
  return { start, end };
}

export type PeriodStatus = 'done' | 'now' | 'upcoming' | 'normal';

/**
 * Compute the status of a period given the current time.
 * Uses actual start AND end so a 2-hour lab is "now" for its full duration.
 */
export function getPeriodStatus(timeStr: string, nowHour: number, isToday: boolean): PeriodStatus {
  if (!isToday) return 'normal';
  const { start, end } = parsePeriodTimes(timeStr);
  if (nowHour > end)   return 'done';
  if (nowHour >= start) return 'now';
  return 'upcoming';
}
