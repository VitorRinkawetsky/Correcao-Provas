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
            examQuestion.score,
            alternative.id AS alternativeId,
            alternative.alternative_text AS alternativeText,
            alternative.is_correct AS isCorrect
        FROM exam_version_questions AS versionQuestion
        INNER JOIN questions AS question
            ON question.id = versionQuestion.question_id
        INNER JOIN exam_versions AS version
            ON version.id = versionQuestion.exam_version_id
        INNER JOIN applications AS application
            ON application.id = version.application_id
        INNER JOIN exam_questions AS examQuestion
            ON examQuestion.exam_id = application.exam_id
            AND examQuestion.question_id = versionQuestion.question_id
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
                score: Number(row.score),
                alternatives: []
            });
        }

        questionsById.get(row.questionId).alternatives.push({
            id: row.alternativeId,
            text: row.alternativeText,
            isCorrect: Boolean(row.isCorrect)
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

const findCorrectionById = async (id, teacherId, db = pool) => {
    const [rows] = await db.execute(`
        SELECT
            correction.id,
            correction.exam_version_id AS examVersionId,
            correction.exam_assignment_id AS assignmentId,
            correction.student_id AS studentId,
            correction.reported_student_name AS studentName,
            correction.reported_student_registration AS studentRegistration,
            correction.status,
            correction.total_score AS totalScore,
            correction.notes,
            correction.confirmed_at AS confirmedAt,
            version.version_number AS versionNumber,
            version.public_code AS publicCode,
            version.qr_code_payload AS qrCodePayload,
            exam.title AS examTitle,
            classroom.name AS className
        FROM corrections AS correction
        INNER JOIN exam_versions AS version
            ON version.id = correction.exam_version_id
        INNER JOIN applications AS application
            ON application.id = version.application_id
        INNER JOIN exams AS exam
            ON exam.id = application.exam_id
        INNER JOIN classes AS classroom
            ON classroom.id = application.class_id
        WHERE correction.id = ?
            AND application.teacher_id = ?
        LIMIT 1
    `, [id, teacherId]);

    if (!rows[0]) return null;

    const [questions] = await db.execute(`
        SELECT
            versionQuestion.question_id AS questionId,
            versionQuestion.printed_order AS printedOrder,
            question.statement,
            examQuestion.score,
            versionAlternative.alternative_id AS alternativeId,
            versionAlternative.printed_order AS alternativeOrder,
            alternative.alternative_text AS alternativeText,
            alternative.is_correct AS isCorrect,
            answer.selected_alternative_id AS selectedAlternativeId,
            answer.is_correct AS answerIsCorrect,
            answer.awarded_score AS awardedScore
        FROM exam_version_questions AS versionQuestion
        INNER JOIN questions AS question
            ON question.id = versionQuestion.question_id
        INNER JOIN applications AS application
            ON application.id = (
                SELECT application_id
                FROM exam_versions
                WHERE id = versionQuestion.exam_version_id
            )
        INNER JOIN exam_questions AS examQuestion
            ON examQuestion.exam_id = application.exam_id
            AND examQuestion.question_id = versionQuestion.question_id
        INNER JOIN exam_version_alternatives AS versionAlternative
            ON versionAlternative.exam_version_id = versionQuestion.exam_version_id
            AND versionAlternative.question_id = versionQuestion.question_id
        INNER JOIN alternatives AS alternative
            ON alternative.id = versionAlternative.alternative_id
            AND alternative.question_id = versionQuestion.question_id
        LEFT JOIN correction_answers AS answer
            ON answer.correction_id = ?
            AND answer.question_id = versionQuestion.question_id
        WHERE versionQuestion.exam_version_id = ?
        ORDER BY versionQuestion.printed_order, versionAlternative.printed_order
    `, [id, rows[0].examVersionId]);

    const questionsById = new Map();
    questions.forEach((row) => {
        if (!questionsById.has(row.questionId)) {
            questionsById.set(row.questionId, {
                questionId: row.questionId,
                printedOrder: Number(row.printedOrder),
                statement: row.statement,
                score: Number(row.score),
                selectedAlternativeId: row.selectedAlternativeId
                    ? Number(row.selectedAlternativeId)
                    : null,
                isCorrect: Boolean(row.answerIsCorrect),
                awardedScore: Number(row.awardedScore || 0),
                alternatives: []
            });
        }

        const question = questionsById.get(row.questionId);
        question.alternatives.push({
            id: row.alternativeId,
            text: row.alternativeText,
            isCorrect: Boolean(row.isCorrect),
            printedOrder: Number(row.alternativeOrder)
        });
    });

    return {
        ...rows[0],
        totalScore: Number(rows[0].totalScore),
        questions: [...questionsById.values()]
    };
};

const updateCorrection = async (id, data, db = pool) => {
    await db.execute(`
        UPDATE corrections
        SET
            reported_student_name = ?,
            reported_student_registration = ?,
            status = 'confirmed',
            total_score = ?,
            notes = ?,
            confirmed_at = CURRENT_TIMESTAMP(3),
            corrected_by = ?,
            sync_status = 'synced'
        WHERE id = ?
    `, [
        data.studentName || null,
        data.studentRegistration || null,
        data.totalScore,
        data.notes || null,
        data.teacherId,
        id
    ]);

    await db.execute(
        'DELETE FROM correction_answers WHERE correction_id = ?',
        [id]
    );

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
        id,
        answer.questionId,
        answer.selectedAlternativeId,
        answer.isCorrect,
        answer.awardedScore
    ])]);
};

module.exports = {
    findCorrectionContext,
    insertCorrection,
    findCorrectionById,
    updateCorrection
};
