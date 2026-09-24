
const { getClient } = require('../config/db');
const studentRepository = require('../repositories/studentRepository');
const transferRepository = require('../repositories/transferRepository');
const auditRepository = require('../repositories/audit.repository');
const { ApiError } = require('../utils/apiResponse');

async function transferStudent(payload, performedBy) {
  const student = await studentRepository.findById(payload.studentId);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  // Resolve the target semester ID.
  let newSemesterId = payload.newSemesterId;

  if (!newSemesterId && payload.newSemester) {
    newSemesterId = await getSemesterIdFromNumber(
      payload.newSemester,
    );
  }

  if (!newSemesterId) {
    throw new ApiError(
      400,
      `Invalid semester: ${payload.newSemester}`,
    );
  }

  // -------------------------------------------------------
  // Validate that something actually changed
  // -------------------------------------------------------
  const isSameProgram =
    Number(student.programId) === Number(payload.newProgramId);

  const isSameDepartment =
    Number(student.departmentId) === Number(payload.newDepartmentId);

  const isSameSemester =
    Number(student.semesterId) === Number(newSemesterId);

  const isSameSection =
    Number(student.sectionId) === Number(payload.newSectionId);

  if (
    isSameProgram &&
    isSameDepartment &&
    isSameSemester &&
    isSameSection
  ) {
    throw new ApiError(
      400,
      'Transfer cannot be completed: no changes detected. The target academic placement is identical to the current placement.',
    );
  }

  // -------------------------------------------------------
  // Start transaction
  // -------------------------------------------------------
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // -----------------------------------------------------
    // Create transfer history record
    // -----------------------------------------------------
    const transferId =
      await transferRepository.createTransfer(client, {
        studentId: payload.studentId,

        oldProgramId: student.programId,
        oldDepartmentId: student.departmentId,
        oldSemesterId: student.semesterId,
        oldSectionId: student.sectionId,

        newProgramId: payload.newProgramId,
        newDepartmentId: payload.newDepartmentId,
        newSemesterId: newSemesterId,
        newSemesterNumber: payload.newSemester,
        newSectionId: payload.newSectionId,

        reason: payload.remarks,
        documentUrl: payload.supportingDocumentUrl,
      });

    // -----------------------------------------------------
    // IMPORTANT:
    // Update the student's academic placement AND status.
    //
    // The dashboard uses status = 'transferred' to calculate
    // the transferred-student count.
    // -----------------------------------------------------
    const updateResult = await client.query(
      `UPDATE students
       SET
         program_id = $1,
         department_id = $2,
         semester_id = $3,
         section_id = $4,
         status = 'Transferred',
         updated_at = NOW()
       WHERE library_id = $5
       RETURNING library_id`,
      [
        payload.newProgramId,
        payload.newDepartmentId,
        newSemesterId,
        payload.newSectionId,
        payload.studentId,
      ],
    );

    if (updateResult.rowCount === 0) {
      throw new ApiError(
        404,
        'Student could not be updated during transfer.',
      );
    }

    // -----------------------------------------------------
    // Commit transaction
    // -----------------------------------------------------
    await client.query('COMMIT');

    // -----------------------------------------------------
    // Fetch updated student
    // -----------------------------------------------------
    const updatedStudent =
      await studentRepository.findById(payload.studentId);

    await auditRepository.create({
      userId: performedBy,
      action: 'STUDENT_TRANSFERRED',
      module: 'transfer',
      recordId: payload.studentId,
      oldValue: {
        programId: student.programId,
        departmentId: student.departmentId,
        semesterId: student.semesterId,
        sectionId: student.sectionId,
      },
      newValue: {
        transferId,
        programId: payload.newProgramId,
        departmentId: payload.newDepartmentId,
        semesterId: newSemesterId,
        sectionId: payload.newSectionId,
        reason: payload.remarks,
      },
    });

    return {
      transferId,
      student: updatedStudent,
    };

  } catch (err) {

    await client.query('ROLLBACK');

    throw err;

  } finally {

    client.release();
  }
}


// ---------------------------------------------------------
// Resolve semester number → semester ID
// ---------------------------------------------------------
async function getSemesterIdFromNumber(semesterNumber) {
  const result = await require('../config/db').query(
    `SELECT semester_id
     FROM semesters
     WHERE semester_number = $1`,
    [semesterNumber],
  );

  return result.rows[0]?.semester_id;
}


// ---------------------------------------------------------
// Transfer History
// ---------------------------------------------------------
async function getTransferHistory(studentId) {
  const student =
    await studentRepository.findById(studentId);

  if (!student) {
    throw new ApiError(
      404,
      'Student not found',
    );
  }

  return transferRepository.findByStudentId(studentId);
}


// ---------------------------------------------------------
// All Transfers — backs the Dashboard's "Transferred Students" detail view
// ---------------------------------------------------------
async function listAllTransfers() {
  return transferRepository.findAll();
}


module.exports = {
  transferStudent,
  getTransferHistory,
  listAllTransfers,
};

