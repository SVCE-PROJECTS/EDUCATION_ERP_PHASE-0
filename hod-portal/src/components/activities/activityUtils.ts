import { ActivityStudent } from './ActivityCard';

export function parseActivityDescription(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Each student on a project/event is stored as its own row, grouped back
// together purely by matching activity_type + title + academic_year text —
// there's no shared project id. Normalizing case/whitespace here means a
// student added with a slightly different typing of the same title (e.g.
// trailing space, different casing) still lands on the existing card
// instead of silently starting a new one-student card that's easy to miss.
export function getActivityGroupKey(item: any): string {
  const type = String(item?.activity_type ?? '').trim().toLowerCase();
  const title = String(item?.title ?? '').trim().toLowerCase();
  const academicYear = String(item?.academic_year ?? '').trim().toLowerCase();
  return `${type}|${title}|${academicYear}`;
}

export function getActivityStudents(item: any): ActivityStudent[] {
  const description = parseActivityDescription(item?.description);
  const embedded = Array.isArray(description.students) ? description.students : [];

  const students: ActivityStudent[] = embedded.map((student: any) => ({
    id: student?.library_id ?? student?.student_id ?? null,
    name: student?.studentName ?? student?.name ?? null,
    usn: student?.usn ?? null,
    semester: student?.semester ?? null,
    section: student?.section ?? null,
  }));

  // For Technical/Sports/Cultural/Hackathon/OtherCurricular/IndustryProject
  // records, the activity row itself IS the real student (one row per
  // student). The repository already returns student_name and usn from that
  // join, and `id` (aliased from activity_id) is this row's own real,
  // independently editable/deletable identity — attached here as
  // `activityId` so callers can map a displayed student back to their exact
  // row instead of only the group's representative item.
  if (item?.student_id || item?.student_name || item?.usn) {
    students.push({
      id: item.student_id ?? null,
      activityId: item.id ?? null,
      name: item.student_name ?? null,
      usn: item.usn ?? null,
      semester: description.semester ?? null,
      section: description.section ?? null,
    });
  }

  const seen = new Set<string>();
  return students.filter((student) => {
    if (!student.name && !student.usn) return false;
    const key = String(student.id ?? student.usn ?? `${student.name}|${student.semester}|${student.section}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getDescriptionValue(item: any, key: string): any {
  return parseActivityDescription(item?.description)[key];
}
