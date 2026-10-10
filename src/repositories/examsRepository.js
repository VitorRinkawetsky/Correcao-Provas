const { pool } = require('../config/database');

const listExams = async (teacherId, db = pool) => {
    const [rows] = await db.execute(`
        SELECT e.id, e.teacher_id AS teacherId, e.title, e.description, e.status,
            e.created_at AS createdAt,
            COUNT(eq.question_id) AS questionCount,
            COALESCE(SUM(eq.score), 0) AS totalScore
        FROM exams e
        LEFT JOIN exam_questions eq ON eq.exam_id = e.id
        WHERE e.teacher_id = ?
        GROUP BY e.id, e.teacher_id, e.title, e.description, e.status, e.created_at
        ORDER BY e.created_at DESC, e.id DESC
    `, [teacherId]);

    return rows.map((row) => ({
        ...row,
        questionCount: Number(row.questionCount),
        totalScore: Number(row.totalScore)
    }));
};

const findExam = async (id, teacherId, db = pool, lock = false) => {
    const [rows] = await db.execute(`
        SELECT e.id, e.teacher_id AS teacherId, e.title, e.description, e.status,
            e.created_at AS createdAt
        FROM exams e
        WHERE e.id = ? AND e.teacher_id = ?
        ${lock ? 'FOR UPDATE' : ''}
    `, [id, teacherId]);

    return rows[0] || null;
};

const listExamQuestions = async (examId, db = pool) => {
    const [rows] = await db.execute(`
        SELECT q.id, q.teacher_id AS teacherId, q.statement,
            eq.question_order AS questionOrder, eq.score,
            GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '|||') AS tags,
            a.id AS alternativeId, a.alternative_text AS alternativeText, a.is_correct AS isCorrect
        FROM exam_questions eq
        INNER JOIN questions q ON q.id = eq.question_id
        LEFT JOIN question_tags qt ON qt.question_id = q.id
        LEFT JOIN tags t ON t.id = qt.tag_id
        LEFT JOIN alternatives a ON a.question_id = q.id
        WHERE eq.exam_id = ?
        GROUP BY q.id, q.teacher_id, q.statement, eq.question_order, eq.score,
            a.id, a.alternative_text, a.is_correct, a.position
        ORDER BY eq.question_order, a.position
    `, [examId]);

    const questionsById = new Map();
    rows.forEach((row) => {
        if (!questionsById.has(row.id)) {
            questionsById.set(row.id, {
                id: row.id,
                teacherId: row.teacherId,
                type: 'objetiva',
                statement: row.statement,
                order: Number(row.questionOrder),
                score: Number(row.score),
                tags: row.tags ? row.tags.split('|||').filter(Boolean) : [],
                alternatives: [],
                correctAlternativeId: null
            });
        }

        const question = questionsById.get(row.id);
        if (row.alternativeId) {
            question.alternatives.push({
                id: row.alternativeId,
                text: row.alternativeText
            });
            if (row.isCorrect) question.correctAlternativeId = row.alternativeId;
        }
    });

    return [...questionsById.values()];
};

const insertExam = async (teacherId, data, db) => {
    const [result] = await db.execute(`
        INSERT INTO exams (teacher_id, title, description, status)
        VALUES (?, ?, ?, 'draft')
    `, [teacherId, data.title, data.description || null]);

    return result.insertId;
};

const updateExam = (id, teacherId, data, db) => db.execute(`
    UPDATE exams
    SET title = ?, description = ?
    WHERE id = ? AND teacher_id = ?
`, [data.title, data.description || null, id, teacherId]);

const hasApplications = async (examId, db = pool) => {
    const [rows] = await db.execute(`
        SELECT 1
        FROM applications
        WHERE exam_id = ?
        LIMIT 1
    `, [examId]);

    return rows.length > 0;
};

const archiveExam = (id, teacherId, db) => db.execute(`
    UPDATE exams
    SET status = 'archived'
    WHERE id = ? AND teacher_id = ?
`, [id, teacherId]);

const replaceExamQuestions = async (examId, questions, db) => {
    await db.execute('DELETE FROM exam_questions WHERE exam_id = ?', [examId]);

    if (questions.length === 0) return;

    await db.query(`
        INSERT INTO exam_questions (exam_id, question_id, question_order, score)
        VALUES ?
    `, [questions.map((question, index) => [
        examId,
        question.questionId,
        index + 1,
        question.score
    ])]);
};

const listOwnedQuestionIds = async (teacherId, questionIds, db) => {
    if (questionIds.length === 0) return [];

    const [rows] = await db.query(`
        SELECT id
        FROM questions
        WHERE teacher_id = ? AND status = 'active' AND id IN (?)
    `, [teacherId, questionIds]);

    return rows.map((row) => Number(row.id));
};

module.exports = {
    listExams,
    findExam,
    listExamQuestions,
    insertExam,
    updateExam,
    hasApplications,
    archiveExam,
    replaceExamQuestions,
    listOwnedQuestionIds
};
