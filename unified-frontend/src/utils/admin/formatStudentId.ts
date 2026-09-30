// @ts-nocheck
// Shows both identifiers together when a student has both, e.g. "1CS22IS001 / LIB4521".
// Falls back to whichever one exists, or '-' if neither is set.
export const formatStudentId = (student) => {
  if (!student) return '-';
  const { usn, libraryId } = student;
  if (usn && libraryId) return `${usn} / ${libraryId}`;
  return usn || libraryId || '-';
};

export default formatStudentId;
