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

/*
|--------------------------------------------------------------------------
| CRUD do banco de questões (/api/questions)
|--------------------------------------------------------------------------
| Todas as consultas filtram por teacher_id. Questões arquivadas ficam
| invisíveis para o professor, mas continuam ligadas às provas, versões e
| correções que já as utilizaram.
*/

const STATUS = { ACTIVE: 'active', ARCHIVED: 'archived' };

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const attachRelations = async (rows, db) => {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const [alternatives] = await db.query(`
        SELECT id, question_id AS questionId, position,
            alternative_text AS text, is_correct AS isCorrect
        FROM alternatives
        WHERE question_id IN (?)
        ORDER BY question_id, position
    `, [ids]);
    const [tags] = await db.query(`
        SELECT qt.question_id AS questionId, t.name
        FROM question_tags qt
        INNER JOIN tags t ON t.id = qt.tag_id
        WHERE qt.question_id IN (?)
        ORDER BY t.name
    `, [ids]);

    const byId = new Map(rows.map((row) => [row.id, {
        ...row,
        type: 'objetiva',
        alternatives: [],
        tags: [],
        correctAlternativeId: null,
        correctAlternativeIndex: -1
    }]));

    alternatives.forEach((alternative) => {
        const question = byId.get(alternative.questionId);
        question.alternatives.push({
            id: alternative.id,
            position: alternative.position,
            text: alternative.text,
            isCorrect: Boolean(alternative.isCorrect)
        });
    });
    tags.forEach((tag) => byId.get(tag.questionId).tags.push(tag.name));

    byId.forEach((question) => {
        question.correctAlternativeIndex = question.alternatives
            .findIndex((alternative) => alternative.isCorrect);
        question.correctAlternativeId = question.alternatives
            .find((alternative) => alternative.isCorrect)?.id ?? null;
    });

    return rows.map((row) => byId.get(row.id));
};

const QUESTION_COLUMNS = `
    q.id, q.teacher_id AS teacherId, q.statement, q.status,
    q.created_at AS createdAt, q.updated_at AS updatedAt
`;

const findAll = async (teacherId, { search = '', tags = [] } = {}, db = pool) => {
    const where = ['q.teacher_id = ?', 'q.status = ?'];
    const params = [teacherId, STATUS.ACTIVE];

    if (search) {
        where.push('q.statement LIKE ?');
        params.push(`%${escapeLike(search)}%`);
    }

    tags.forEach((tag) => {
        where.push(`EXISTS (
            SELECT 1 FROM question_tags qt
            INNER JOIN tags t ON t.id = qt.tag_id
            WHERE qt.question_id = q.id AND t.name = ?
        )`);
        params.push(tag);
    });

    const [rows] = await db.query(
        `SELECT ${QUESTION_COLUMNS} FROM questions q
         WHERE ${where.join(' AND ')} ORDER BY q.id`,
        params
    );

    return attachRelations(rows, db);
};

const findById = async (teacherId, id, db = pool) => {
    const [rows] = await db.query(
        `SELECT ${QUESTION_COLUMNS} FROM questions q
         WHERE q.id = ? AND q.teacher_id = ? AND q.status = ?`,
        [id, teacherId, STATUS.ACTIVE]
    );
    const [question] = await attachRelations(rows, db);

    return question || null;
};

// Bloqueia a linha: impede que uma prova passe a usar a questão enquanto
// ela é editada, arquivada ou excluída.
const lockActiveOwned = async (teacherId, id, db) => {
    const [rows] = await db.query(
        `SELECT id FROM questions
         WHERE id = ? AND teacher_id = ? AND status = ? FOR UPDATE`,
        [id, teacherId, STATUS.ACTIVE]
    );

    return rows.length > 0;
};

// Provas, versões geradas e correções referenciam a questão (FK RESTRICT).
const hasHistory = async (id, db) => {
    const [rows] = await db.query(`
        SELECT 1 FROM exam_questions WHERE question_id = ?
        UNION ALL
        SELECT 1 FROM exam_version_questions WHERE question_id = ?
        UNION ALL
        SELECT 1 FROM correction_answers WHERE question_id = ?
        LIMIT 1
    `, [id, id, id]);

    return rows.length > 0;
};

const insertQuestion = async (teacherId, statement, db) => {
    const [result] = await db.query(
        'INSERT INTO questions (teacher_id, statement, status) VALUES (?, ?, ?)',
        [teacherId, statement, STATUS.ACTIVE]
    );

    return result.insertId;
};

const updateStatement = (teacherId, id, statement, db) => db.query(
    'UPDATE questions SET statement = ? WHERE id = ? AND teacher_id = ?',
    [statement, id, teacherId]
);

const archiveQuestion = (teacherId, id, db) => db.query(
    'UPDATE questions SET status = ? WHERE id = ? AND teacher_id = ?',
    [STATUS.ARCHIVED, id, teacherId]
);

const deleteQuestion = async (teacherId, id, db) => {
    await db.query('DELETE FROM question_tags WHERE question_id = ?', [id]);
    await db.query('DELETE FROM alternatives WHERE question_id = ?', [id]);
    await db.query(
        'DELETE FROM questions WHERE id = ? AND teacher_id = ?',
        [id, teacherId]
    );
};

// Só deve ser chamado para questões sem histórico (alternatives é referenciada
// por versões e correções). O trigger do schema mantém a unicidade da correta.
const replaceAlternatives = async (questionId, alternatives, db) => {
    await db.query('DELETE FROM alternatives WHERE question_id = ?', [questionId]);
    await db.query(
        `INSERT INTO alternatives (question_id, position, alternative_text, is_correct)
         VALUES ?`,
        [alternatives.map((alternative, index) => [
            questionId,
            index + 1,
            alternative.text,
            alternative.isCorrect ? 1 : 0
        ])]
    );
};

const replaceTags = async (questionId, tagNames, db) => {
    await db.query('DELETE FROM question_tags WHERE question_id = ?', [questionId]);

    for (const name of tagNames) {
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
};

module.exports = {
    listQuestions,
    findAll,
    findById,
    lockActiveOwned,
    hasHistory,
    insertQuestion,
    updateStatement,
    archiveQuestion,
    deleteQuestion,
    replaceAlternatives,
    replaceTags
};
