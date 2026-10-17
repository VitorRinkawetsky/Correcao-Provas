const { pool } = require('../config/database');

const mapQuestionRows = (rows) => {
    const questionsById = new Map();

    rows.forEach((row) => {
        if (!questionsById.has(row.id)) {
            questionsById.set(row.id, {
                id: row.id,
                teacherId: row.teacherId,
                type: 'objetiva',
                statement: row.statement,
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

const listQuestions = async (teacherId, db = pool) => {
    const [rows] = await db.execute(`
        SELECT q.id, q.teacher_id AS teacherId, q.statement,
            GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '|||') AS tags,
            a.id AS alternativeId, a.alternative_text AS alternativeText, a.is_correct AS isCorrect
        FROM questions q
        LEFT JOIN question_tags qt ON qt.question_id = q.id
        LEFT JOIN tags t ON t.id = qt.tag_id
        LEFT JOIN alternatives a ON a.question_id = q.id
        WHERE q.teacher_id = ? AND q.status = 'active'
        GROUP BY q.id, q.teacher_id, q.statement, a.id, a.alternative_text, a.is_correct, a.position
        ORDER BY q.id, a.position
    `, [teacherId]);

    return mapQuestionRows(rows);
};

module.exports = {
    listQuestions
};
