const { pool } = require('../config/database');

const STATUS = { ACTIVE: 'active', ARCHIVED: 'archived' };

const QUESTION_COLUMNS = `
    q.id,
    q.teacher_id  AS teacherId,
    q.statement,
    q.status,
    q.created_at  AS createdAt,
    q.updated_at  AS updatedAt
`;

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

async function attachRelations(db, rows) {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);

    const [alternatives] = await db.query(
        `SELECT id, question_id AS questionId, position,
                alternative_text AS text, is_correct AS isCorrect
           FROM alternatives
          WHERE question_id IN (?)
          ORDER BY question_id, position`,
        [ids]
    );

    const [tags] = await db.query(
        `SELECT qt.question_id AS questionId, t.name
           FROM question_tags qt
           JOIN tags t ON t.id = qt.tag_id
          WHERE qt.question_id IN (?)
          ORDER BY t.name`,
        [ids]
    );

    const byId = new Map(
        rows.map((row) => [row.id, { ...row, alternatives: [], tags: [] }])
    );

    alternatives.forEach((a) =>
        byId.get(a.questionId).alternatives.push({
            id: a.id,
            position: a.position,
            text: a.text,
            isCorrect: Boolean(a.isCorrect)
        })
    );
    tags.forEach((t) => byId.get(t.questionId).tags.push(t.name));

    return rows.map((row) => {
        const question = byId.get(row.id);
        // Usado pela tela de edição para marcar a alternativa correta.
        question.correctAlternativeIndex = question.alternatives.findIndex(
            (a) => a.isCorrect
        );
        return question;
    });
}

async function list(teacherId, { search, tags }) {
    const where = ['q.teacher_id = ?', 'q.status = ?'];
    const params = [teacherId, STATUS.ACTIVE];

    if (search) {
        where.push('q.statement LIKE ?');
        params.push(`%${escapeLike(search)}%`);
    }

    for (const tag of tags) {
        where.push(
            `EXISTS (
                SELECT 1
                  FROM question_tags qt
                  JOIN tags t ON t.id = qt.tag_id
                 WHERE qt.question_id = q.id AND t.name LIKE ?
            )`
        );
        params.push(`%${escapeLike(tag)}%`);
    }

    const [rows] = await pool.query(
        `SELECT ${QUESTION_COLUMNS}
           FROM questions q
          WHERE ${where.join(' AND ')}
          ORDER BY q.id ASC`,
        params
    );

    return attachRelations(pool, rows);
}

async function findById(teacherId, id, db = pool) {
    const [rows] = await db.query(
        `SELECT ${QUESTION_COLUMNS}
           FROM questions q
          WHERE q.id = ? AND q.teacher_id = ? AND q.status = ?`,
        [id, teacherId, STATUS.ACTIVE]
    );

    const [question] = await attachRelations(db, rows);
    return question || null;
}

// Trava a linha do professor dono dentro da transação.
async function lockOwned(db, teacherId, id) {
    const [rows] = await db.query(
        `SELECT id FROM questions
          WHERE id = ? AND teacher_id = ? AND status = ?
          FOR UPDATE`,
        [id, teacherId, STATUS.ACTIVE]
    );
    return rows[0] || null;
}

async function isUsedInExam(db, id) {
    const [rows] = await db.query(
        'SELECT 1 FROM exam_questions WHERE question_id = ? LIMIT 1',
        [id]
    );
    return rows.length > 0;
}

async function insertQuestion(db, teacherId, statement) {
    const [result] = await db.query(
        'INSERT INTO questions (teacher_id, statement, status) VALUES (?, ?, ?)',
        [teacherId, statement, STATUS.ACTIVE]
    );
    return result.insertId;
}

async function updateStatement(db, teacherId, id, statement) {
    await db.query(
        'UPDATE questions SET statement = ? WHERE id = ? AND teacher_id = ?',
        [statement, id, teacherId]
    );
}

async function archive(db, teacherId, id) {
    await db.query(
        'UPDATE questions SET status = ? WHERE id = ? AND teacher_id = ?',
        [STATUS.ARCHIVED, id, teacherId]
    );
}

async function remove(db, teacherId, id) {
    await db.query('DELETE FROM question_tags WHERE question_id = ?', [id]);
    await db.query('DELETE FROM alternatives WHERE question_id = ?', [id]);
    await db.query('DELETE FROM questions WHERE id = ? AND teacher_id = ?', [
        id,
        teacherId
    ]);
}

async function replaceAlternatives(db, questionId, alternatives) {
    await db.query('DELETE FROM alternatives WHERE question_id = ?', [questionId]);

    await db.query(
        `INSERT INTO alternatives (question_id, position, alternative_text, is_correct)
         VALUES ?`,
        [
            alternatives.map((a, index) => [
                questionId,
                index + 1,
                a.text,
                a.isCorrect ? 1 : 0
            ])
        ]
    );
}

async function replaceTags(db, questionId, tagNames) {
    await db.query('DELETE FROM question_tags WHERE question_id = ?', [questionId]);

    for (const name of tagNames) {
        // insertId vem como o id da tag, tanto na criação quanto no duplicado.
        const [result] = await db.query(
            `INSERT INTO tags (name) VALUES (?)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [name]
        );

        await db.query(
            'INSERT IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)',
            [questionId, result.insertId]
        );
    }
}

module.exports = {
    list,
    findById,
    lockOwned,
    isUsedInExam,
    insertQuestion,
    updateStatement,
    archive,
    remove,
    replaceAlternatives,
    replaceTags
};