const { pool } = require('../config/database');

async function findOwnedApplication(applicationId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT a.id, a.class_id AS classId
         FROM applications a
         WHERE a.id = ? AND a.teacher_id = ?`,
        [applicationId, teacherId]
    );

    return rows[0] ?? null;
}

async function listCorrections(applicationId, teacherId, search = '', db = pool) {
    const hasSearch = search.length > 0;
    const searchClause = hasSearch
        ? `AND (
               INSTR(LOWER(s.full_name), LOWER(?)) > 0
               OR INSTR(LOWER(s.registration), LOWER(?)) > 0
           )`
        : '';
    const params = hasSearch
        ? [applicationId, teacherId, search, search]
        : [applicationId, teacherId];
    const [rows] = await db.execute(
        `SELECT
            c.id,
            ev.application_id AS applicationId,
            c.exam_version_id AS examVersionId,
            ev.version_number AS versionNumber,
            c.exam_assignment_id AS examAssignmentId,
            COALESCE(c.student_id, ea.student_id) AS studentId,
            s.full_name AS studentName,
            s.registration,
            c.status,
            c.total_score AS totalScore,
            c.notes,
            c.confirmed_at AS confirmedAt,
            c.created_at AS createdAt,
            COUNT(ca.question_id) AS questionCount,
            COUNT(ca.selected_alternative_id) AS answeredCount
         FROM corrections c
         INNER JOIN exam_versions ev ON ev.id = c.exam_version_id
         INNER JOIN applications a ON a.id = ev.application_id
         LEFT JOIN exam_assignments ea ON ea.id = c.exam_assignment_id
         INNER JOIN students s ON s.id = COALESCE(c.student_id, ea.student_id)
         LEFT JOIN correction_answers ca ON ca.correction_id = c.id
         WHERE ev.application_id = ?
           AND a.teacher_id = ?
           AND (c.student_id IS NOT NULL OR c.exam_assignment_id IS NOT NULL)
           ${searchClause}
         GROUP BY
            c.id,
            ev.application_id,
            c.exam_version_id,
            ev.version_number,
            c.exam_assignment_id,
            c.student_id,
            ea.student_id,
            s.full_name,
            s.registration,
            c.status,
            c.total_score,
            c.notes,
            c.confirmed_at,
            c.created_at
         ORDER BY c.created_at DESC, c.id DESC`,
        params
    );

    return rows;
}

async function listVersions(applicationId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT ev.id, ev.version_number AS versionNumber
         FROM exam_versions ev
         INNER JOIN applications a ON a.id = ev.application_id
         WHERE ev.application_id = ? AND a.teacher_id = ?
         ORDER BY ev.version_number ASC`,
        [applicationId, teacherId]
    );

    return rows;
}

async function findOwnedVersion(versionId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            ev.id,
            ev.application_id AS applicationId,
            ev.version_number AS versionNumber,
            a.class_id AS classId
         FROM exam_versions ev
         INNER JOIN applications a ON a.id = ev.application_id
         WHERE ev.id = ? AND a.teacher_id = ?`,
        [versionId, teacherId]
    );

    return rows[0] ?? null;
}

async function findOwnedVersionForUpdate(versionId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            ev.id,
            ev.application_id AS applicationId,
            ev.version_number AS versionNumber,
            a.class_id AS classId
         FROM exam_versions ev
         INNER JOIN applications a ON a.id = ev.application_id
         WHERE ev.id = ? AND a.teacher_id = ?
         FOR UPDATE`,
        [versionId, teacherId]
    );

    return rows[0] ?? null;
}

async function listVersionAnswerKey(versionId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            evq.question_id AS questionId,
            evq.printed_order AS questionOrder,
            q.statement,
            eq.score,
            eva.alternative_id AS alternativeId,
            eva.printed_order AS alternativeOrder,
            alt.alternative_text AS alternativeText,
            alt.is_correct AS isCorrect
         FROM exam_versions ev
         INNER JOIN applications a ON a.id = ev.application_id
         INNER JOIN exam_version_questions evq ON evq.exam_version_id = ev.id
         INNER JOIN questions q ON q.id = evq.question_id
         INNER JOIN exam_questions eq
            ON eq.exam_id = a.exam_id
            AND eq.question_id = evq.question_id
         LEFT JOIN exam_version_alternatives eva
            ON eva.exam_version_id = evq.exam_version_id
            AND eva.question_id = evq.question_id
         LEFT JOIN alternatives alt
            ON alt.id = eva.alternative_id
            AND alt.question_id = eva.question_id
         WHERE ev.id = ? AND a.teacher_id = ?
         ORDER BY evq.printed_order ASC, eva.printed_order ASC`,
        [versionId, teacherId]
    );

    return rows;
}

async function findCorrectionConflict(
    examVersionId,
    studentId,
    assignmentId,
    db = pool
) {
    const [rows] = await db.execute(
        `SELECT c.id
         FROM corrections c
         WHERE (c.exam_version_id = ? AND c.student_id = ?)
            OR (? IS NOT NULL AND c.exam_assignment_id = ?)
         LIMIT 1
         FOR UPDATE`,
        [examVersionId, studentId, assignmentId, assignmentId]
    );

    return rows[0] ?? null;
}

async function insertCorrection(correction, db = pool) {
    const [result] = await db.execute(
        `INSERT INTO corrections (
            exam_assignment_id,
            exam_version_id,
            student_id,
            status,
            total_score,
            notes,
            confirmed_at,
            corrected_by,
            is_automatically_assigned,
            sync_status
         ) VALUES (?, ?, ?, ?, ?, ?,
            CASE WHEN ? = 'confirmed' THEN CURRENT_TIMESTAMP(3) ELSE NULL END,
            ?, FALSE, 'pending')`,
        [
            correction.examAssignmentId,
            correction.examVersionId,
            correction.studentId,
            correction.status,
            correction.totalScore,
            correction.notes,
            correction.status,
            correction.correctedBy
        ]
    );

    return result.insertId;
}

async function insertCorrectionAnswers(correctionId, answers, db = pool) {
    const [result] = await db.query(
        `INSERT INTO correction_answers (
            correction_id,
            question_id,
            selected_alternative_id,
            is_correct,
            awarded_score
         ) VALUES ?`,
        [answers.map((answer) => [
            correctionId,
            answer.questionId,
            answer.selectedAlternativeId,
            answer.isCorrect ? 1 : 0,
            answer.awardedScore
        ])]
    );

    return result.affectedRows;
}

async function findCorrectionById(correctionId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            c.id,
            ev.application_id AS applicationId,
            c.exam_version_id AS examVersionId,
            ev.version_number AS versionNumber,
            c.exam_assignment_id AS examAssignmentId,
            COALESCE(c.student_id, ea.student_id) AS studentId,
            s.full_name AS studentName,
            s.registration,
            c.status,
            c.total_score AS totalScore,
            c.notes,
            c.confirmed_at AS confirmedAt,
            c.created_at AS createdAt,
            COUNT(ca.question_id) AS questionCount,
            COUNT(ca.selected_alternative_id) AS answeredCount
         FROM corrections c
         INNER JOIN exam_versions ev ON ev.id = c.exam_version_id
         INNER JOIN applications a ON a.id = ev.application_id
         LEFT JOIN exam_assignments ea ON ea.id = c.exam_assignment_id
         INNER JOIN students s ON s.id = COALESCE(c.student_id, ea.student_id)
         LEFT JOIN correction_answers ca ON ca.correction_id = c.id
         WHERE c.id = ? AND a.teacher_id = ?
         GROUP BY
            c.id,
            ev.application_id,
            c.exam_version_id,
            ev.version_number,
            c.exam_assignment_id,
            c.student_id,
            ea.student_id,
            s.full_name,
            s.registration,
            c.status,
            c.total_score,
            c.notes,
            c.confirmed_at,
            c.created_at`,
        [correctionId, teacherId]
    );

    return rows[0] ?? null;
}

async function listPending(applicationId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            c.id,
            ev.application_id AS applicationId,
            c.exam_version_id AS examVersionId,
            ev.version_number AS versionNumber,
            c.reported_student_name AS reportedStudentName,
            c.reported_student_registration AS reportedStudentRegistration,
            c.status,
            c.total_score AS totalScore,
            c.created_at AS createdAt
         FROM corrections c
         INNER JOIN exam_versions ev ON ev.id = c.exam_version_id
         INNER JOIN applications a ON a.id = ev.application_id
         WHERE ev.application_id = ?
           AND a.teacher_id = ?
           AND c.student_id IS NULL
           AND c.exam_assignment_id IS NULL
         ORDER BY c.created_at ASC, c.id ASC`,
        [applicationId, teacherId]
    );

    return rows;
}

async function listApplicationStudents(applicationId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT s.id, s.full_name AS fullName, s.registration
         FROM applications a
         INNER JOIN class_students cs ON cs.class_id = a.class_id
         INNER JOIN students s ON s.id = cs.student_id
         WHERE a.id = ?
           AND a.teacher_id = ?
           AND cs.status = 'active'
           AND s.status = 'active'
         ORDER BY s.full_name ASC, s.id ASC`,
        [applicationId, teacherId]
    );

    return rows;
}

async function findCorrectionForUpdate(correctionId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            c.id,
            ev.application_id AS applicationId,
            a.class_id AS classId,
            c.exam_version_id AS examVersionId,
            c.student_id AS studentId,
            c.exam_assignment_id AS examAssignmentId,
            c.reported_student_name AS reportedStudentName,
            c.reported_student_registration AS reportedStudentRegistration,
            c.status,
            c.total_score AS totalScore,
            c.created_at AS createdAt
         FROM corrections c
         INNER JOIN exam_versions ev ON ev.id = c.exam_version_id
         INNER JOIN applications a ON a.id = ev.application_id
         WHERE c.id = ? AND a.teacher_id = ?
         FOR UPDATE`,
        [correctionId, teacherId]
    );

    return rows[0] ?? null;
}

async function findStudentForUpdate(studentId, classId, db = pool) {
    const [rows] = await db.execute(
        `SELECT s.id, s.full_name AS fullName, s.registration
         FROM class_students cs
         INNER JOIN students s ON s.id = cs.student_id
         WHERE cs.class_id = ?
           AND s.id = ?
           AND cs.status = 'active'
           AND s.status = 'active'
         FOR UPDATE`,
        [classId, studentId]
    );

    return rows[0] ?? null;
}

async function findAssignment(examVersionId, studentId, db = pool) {
    const [rows] = await db.execute(
        `SELECT id
         FROM exam_assignments
         WHERE exam_version_id = ? AND student_id = ?
         FOR UPDATE`,
        [examVersionId, studentId]
    );

    return rows[0] ?? null;
}

async function findAssociationConflict(
    correctionId,
    examVersionId,
    studentId,
    assignmentId,
    db = pool
) {
    const [rows] = await db.execute(
        `SELECT c.id
         FROM corrections c
         WHERE c.id <> ?
           AND (
               (c.exam_version_id = ? AND c.student_id = ?)
               OR (? IS NOT NULL AND c.exam_assignment_id = ?)
           )
         LIMIT 1
         FOR UPDATE`,
        [correctionId, examVersionId, studentId, assignmentId, assignmentId]
    );

    return rows[0] ?? null;
}

async function updateAssociation(correctionId, studentId, assignmentId, db = pool) {
    const [result] = await db.execute(
        `UPDATE corrections
         SET student_id = ?, exam_assignment_id = ?
         WHERE id = ?
           AND student_id IS NULL
           AND exam_assignment_id IS NULL`,
        [studentId, assignmentId, correctionId]
    );

    return result.affectedRows;
}

module.exports = {
    findOwnedApplication,
    listCorrections,
    listVersions,
    findOwnedVersion,
    findOwnedVersionForUpdate,
    listVersionAnswerKey,
    findCorrectionConflict,
    insertCorrection,
    insertCorrectionAnswers,
    findCorrectionById,
    listPending,
    listApplicationStudents,
    findCorrectionForUpdate,
    findStudentForUpdate,
    findAssignment,
    findAssociationConflict,
    updateAssociation
};
