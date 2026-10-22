const { pool } = require('../config/database');

const findCorrectionContext = async (code, teacherId, db = pool) => {
    const [rows] = await db.execute(`
        SELECT
            version.id AS examVersionId,
            version.application_id AS applicationId,
            version.version_number AS versionNumber,
            version.public_code AS publicCode,
            version.qr_code_payload AS qrCodePayload,
            exam.title AS examTitle,
            classroom.name AS className,
            assignment.id AS assignmentId,
            assignment.student_id AS assignedStudentId,
            student.full_name AS assignedStudentName,
            student.registration AS assignedStudentRegistration
        FROM exam_versions AS version
        INNER JOIN applications AS application
            ON application.id = version.application_id
        INNER JOIN exams AS exam
            ON exam.id = application.exam_id
        INNER JOIN classes AS classroom
            ON classroom.id = application.class_id
        LEFT JOIN exam_assignments AS assignment
            ON assignment.exam_version_id = version.id
            AND assignment.qr_code_payload = ?
        LEFT JOIN students AS student
            ON student.id = assignment.student_id
        WHERE application.teacher_id = ?
            AND (
                version.qr_code_payload = ?
                OR assignment.qr_code_payload = ?
            )
        LIMIT 1
    `, [code, teacherId, code, code]);

    if (!rows[0]) return null;

    const [questions] = await db.execute(`
        SELECT
            versionQuestion.question_id AS questionId,
            versionQuestion.printed_order AS printedOrder,
            question.statement,
            alternative.id AS alternativeId,
            alternative.alternative_text AS alternativeText
        FROM exam_version_questions AS versionQuestion
        INNER JOIN questions AS question
            ON question.id = versionQuestion.question_id
        INNER JOIN exam_version_alternatives AS versionAlternative
            ON versionAlternative.exam_version_id = versionQuestion.exam_version_id
            AND versionAlternative.question_id = versionQuestion.question_id
        INNER JOIN alternatives AS alternative
            ON alternative.id = versionAlternative.alternative_id
            AND alternative.question_id = versionQuestion.question_id
        WHERE versionQuestion.exam_version_id = ?
        ORDER BY versionQuestion.printed_order, versionAlternative.printed_order
    `, [rows[0].examVersionId]);

    const questionsById = new Map();
    questions.forEach((row) => {
        if (!questionsById.has(row.questionId)) {
            questionsById.set(row.questionId, {
                questionId: row.questionId,
                printedOrder: Number(row.printedOrder),
                statement: row.statement,
                alternatives: []
            });
        }

        questionsById.get(row.questionId).alternatives.push({
            id: row.alternativeId,
            text: row.alternativeText
        });
    });

    return {
        ...rows[0],
        questions: [...questionsById.values()]
    };
};

const insertCorrection = async (data, db = pool) => {
    const [result] = await db.execute(`
        INSERT INTO corrections (
            exam_assignment_id,
            exam_version_id,
            student_id,
            reported_student_name,
            reported_student_registration,
            status,
            total_score,
            notes,
            confirmed_at,
            corrected_by,
            is_automatically_assigned,
            sync_status
        )
        VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, CURRENT_TIMESTAMP(3), ?, ?, 'synced')
    `, [
        data.assignmentId,
        data.examVersionId,
        data.studentId,
        data.studentName,
        data.studentRegistration,
        data.totalScore,
        data.notes || null,
        data.teacherId,
        Boolean(data.studentId)
    ]);

    await db.query(`
        INSERT INTO correction_answers (
            correction_id,
            question_id,
            selected_alternative_id,
            is_correct,
            awarded_score
        )
        VALUES ?
    `, [data.answers.map((answer) => [
        result.insertId,
        answer.questionId,
        answer.selectedAlternativeId,
        answer.isCorrect,
        answer.awardedScore
    ])]);

    return result.insertId;
};

module.exports = {
    findCorrectionContext,
    insertCorrection
};
