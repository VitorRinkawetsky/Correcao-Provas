
const { pool } = require('../config/database');

const STATUS = {
    ACTIVE: 'active',
    ARCHIVED: 'archived'
};

const QUESTION_COLUMNS = `
    q.id,
    q.teacher_id AS teacherId,
    q.statement,
    q.status,
    q.created_at AS createdAt,
    q.updated_at AS updatedAt
`;

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

async function attachRelations(db, rows) {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);

    const [alternatives] = await db.query(
        `SELECT
            id,
            question_id AS questionId,
            position,
            alternative_text AS text,
            is_correct AS isCorrect
         FROM alternatives
         WHERE question_id IN (?)
         ORDER BY question_id, position`,
        [ids]
    );

    const [tags] = await db.query(
        `SELECT
            qt.question_id AS questionId,
            t.name
         FROM question_tags qt
         JOIN tags t ON t.id = qt.tag_id
         WHERE qt.question_id IN (?)
         ORDER BY t.name`,
        [ids]
    );

    const byId = new Map(
        rows.map((row) => [
            row.id,
            { ...row, alternatives: [], tags: [] }
        ])
    );

    for (const alternative of alternatives) {
        const question = byId.get(alternative.questionId);

        if (!question) continue;

        question.alternatives.push({
            id: alternative.id,
            position: alternative.position,
            text: alternative.text,
            isCorrect: Boolean(alternative.isCorrect)
        });
    }

    for (const tag of tags) {
        const question = byId.get(tag.questionId);

        if (question) {
            question.tags.push(tag.name);
        }
    }

    return rows.map((row) => {
        const question = byId.get(row.id);

        question.correctAlternativeIndex =
            question.alternatives.findIndex((alternative) =>
                alternative.isCorrect
            );

        const correctAlternative = question.alternatives.find(
            (alternative) => alternative.isCorrect
        );

        question.correctAlternativeId =
            correctAlternative?.id ?? null;

        return question;
    });
}

async function list(
    teacherId,
    { search, tags = [] } = {}
) {
    const where = [
        'q.teacher_id = ?',
        'q.status = ?'
    ];

    const params = [
        teacherId,
        STATUS.ACTIVE
    ];

    if (search?.trim()) {
        where.push('q.statement LIKE ?');
        params.push(`%${escapeLike(search.trim())}%`);
    }

    for (const tag of tags) {
        where.push(`
            EXISTS (
                SELECT 1
                FROM question_tags qt
                JOIN tags t ON t.id = qt.tag_id
                WHERE qt.question_id = q.id
                  AND t.name LIKE ?
            )
        `);

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
         WHERE q.id = ?
           AND q.teacher_id = ?
           AND q.status = ?`,
        [id, teacherId, STATUS.ACTIVE]
    );

    const [question] = await attachRelations(db, rows);

    return question || null;
}

async function lockOwned(db, teacherId, id) {
    const [rows] = await db.query(
        `SELECT id
         FROM questions
         WHERE id = ?
           AND teacher_id = ?
           AND status = ?
         FOR UPDATE`,
        [id, teacherId, STATUS.ACTIVE]
    );

    return rows[0] || null;
}

async function isUsedInExam(db, id) {
    const [rows] = await db.query(
        `SELECT 1
         FROM exam_questions
         WHERE question_id = ?
         LIMIT 1`,
        [id]
    );

    return rows.length > 0;
}

async function insertQuestion(db, teacherId, statement) {
    const [result] = await db.query(
        `INSERT INTO questions (
            teacher_id,
            statement,
            status
        ) VALUES (?, ?, ?)`,
        [teacherId, statement, STATUS.ACTIVE]
    );

    return result.insertId;
}

async function updateStatement(db, teacherId, id, statement) {
    const [result] = await db.query(
        `UPDATE questions
         SET statement = ?
         WHERE id = ?
           AND teacher_id = ?
           AND status = ?`,
        [statement, id, teacherId, STATUS.ACTIVE]
    );

    return result.affectedRows > 0;
}

async function archive(db, teacherId, id) {
    const [result] = await db.query(
        `UPDATE questions
         SET status = ?
         WHERE id = ?
           AND teacher_id = ?
           AND status = ?`,
        [
            STATUS.ARCHIVED,
            id,
            teacherId,
            STATUS.ACTIVE
        ]
    );

    return result.affectedRows > 0;
}

async function remove(db, teacherId, id) {
    const question = await lockOwned(db, teacherId, id);

    if (!question) return false;

    if (await isUsedInExam(db, id)) {
        return archive(db, teacherId, id);
    }

    await db.query(
        `DELETE FROM question_tags
         WHERE question_id = ?`,
        [id]
    );

    await db.query(
        `DELETE FROM alternatives
         WHERE question_id = ?`,
        [id]
    );

    const [result] = await db.query(
        `DELETE FROM questions
         WHERE id = ?
           AND teacher_id = ?`,
        [id, teacherId]
    );

    return result.affectedRows > 0;
}

async function replaceAlternatives(db, questionId, alternatives) {
    await db.query(
        `DELETE FROM alternatives
         WHERE question_id = ?`,
        [questionId]
    );

    if (!alternatives.length) return;

    await db.query(
        `INSERT INTO alternatives (
            question_id,
            position,
            alternative_text,
            is_correct
        ) VALUES ?`,
        [
            alternatives.map((alternative, index) => [
                questionId,
                index + 1,
                alternative.text,
                alternative.isCorrect ? 1 : 0
            ])
        ]
    );
}

async function replaceTags(db, questionId, tagNames) {
    await db.query(
        `DELETE FROM question_tags
         WHERE question_id = ?`,
        [questionId]
    );

    const uniqueTags = [
        ...new Set(
            tagNames
                .map((name) => name.trim())
                .filter(Boolean)
        )
    ];

    for (const name of uniqueTags) {
        if (name.length > 80) {
            throw new Error(
                'O nome da tag não pode ultrapassar 80 caracteres.'
            );
        }

        const [result] = await db.query(
            `INSERT INTO tags (name)
             VALUES (?)
             ON DUPLICATE KEY UPDATE
                id = LAST_INSERT_ID(id)`,
            [name]
        );

        await db.query(
            `INSERT IGNORE INTO question_tags (
                question_id,
                tag_id
            ) VALUES (?, ?)`,
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
