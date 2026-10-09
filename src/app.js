const express = require('express');
const path = require('path');

const {
    pool,
    checkDatabaseConnection
} = require('./config/database');

const classesRoutes = require('./routes/classesRoutes');
const { handleApiError } = require('./http/ApiError');

const app = express();

app.use(express.json());

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get('/api/health', async (_request, response) => {
    try {
        await checkDatabaseConnection();

        response.json({
            status: 'ok',
            database: 'connected'
        });
    } catch (error) {
        console.error(
            'Falha no health check:',
            error.message
        );

        response.status(500).json({
            status: 'error',
            database: 'disconnected'
        });
    }
});

/*
|--------------------------------------------------------------------------
| LISTAR QUESTÕES
|--------------------------------------------------------------------------
*/

app.get('/api/questions', async (_request, response) => {
    try {
        const [questions] = await pool.execute(`
            SELECT
                q.id,
                q.teacher_id AS teacherId,
                q.statement,
                q.status,
                q.created_at AS createdAt,
                q.updated_at AS updatedAt
            FROM questions q
            ORDER BY q.id ASC
        `);

        const [alternatives] = await pool.execute(`
            SELECT
                id,
                question_id AS questionId,
                position,
                alternative_text AS text,
                is_correct AS isCorrect
            FROM alternatives
            ORDER BY question_id ASC, position ASC
        `);

        const [questionTags] = await pool.execute(`
            SELECT
                qt.question_id AS questionId,
                t.name
            FROM question_tags qt
            INNER JOIN tags t
                ON t.id = qt.tag_id
            ORDER BY qt.question_id ASC, t.name ASC
        `);

        const questionsWithData = questions.map((question) => ({
            ...question,

            alternatives: alternatives
                .filter(
                    (alternative) =>
                        alternative.questionId === question.id
                )
                .map((alternative) => ({
                    id: alternative.id,
                    position: alternative.position,
                    text: alternative.text,
                    isCorrect: Boolean(alternative.isCorrect)
                })),

            tags: questionTags
                .filter(
                    (tag) =>
                        tag.questionId === question.id
                )
                .map((tag) => tag.name)
        }));

        response.json(questionsWithData);
    } catch (error) {
        console.error(
            'Falha ao listar questões:',
            error.message
        );

        response.status(500).json({
            status: 'error',
            message: 'Não foi possível carregar as questões.'
        });
    }
});

/*
|--------------------------------------------------------------------------
| CRIAR QUESTÃO
|--------------------------------------------------------------------------
*/

app.post('/api/questions', async (request, response) => {
    const connection = await pool.getConnection();

    try {
        const {
            statement,
            teacherId = 1,
            tags = [],
            alternatives = [],
            correctAlternativeIndex
        } = request.body;

        if (!String(statement || '').trim()) {
            return response.status(400).json({
                status: 'error',
                message: 'O enunciado da questão é obrigatório.'
            });
        }

        if (!Array.isArray(alternatives) || alternatives.length < 2) {
            return response.status(400).json({
                status: 'error',
                message: 'A questão deve possuir pelo menos duas alternativas.'
            });
        }

        if (
            !Number.isInteger(correctAlternativeIndex) ||
            correctAlternativeIndex < 0 ||
            correctAlternativeIndex >= alternatives.length
        ) {
            return response.status(400).json({
                status: 'error',
                message: 'A alternativa correta é inválida.'
            });
        }

        await connection.beginTransaction();

        const [questionResult] = await connection.execute(
            `
            INSERT INTO questions (
                teacher_id,
                statement,
                status
            )
            VALUES (?, ?, 'active')
            `,
            [
                teacherId,
                String(statement).trim()
            ]
        );

        const questionId = questionResult.insertId;

        for (let index = 0; index < alternatives.length; index += 1) {
            const alternative = alternatives[index];

            await connection.execute(
                `
                INSERT INTO alternatives (
                    question_id,
                    position,
                    alternative_text,
                    is_correct
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    questionId,
                    index + 1,
                    String(alternative.text || '').trim(),
                    index === correctAlternativeIndex
                ]
            );
        }

        for (const tagName of tags) {
            const normalizedTag = String(tagName || '').trim();

            if (!normalizedTag) {
                continue;
            }

            await connection.execute(
                `
                INSERT INTO tags (name)
                VALUES (?)
                ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
                `,
                [normalizedTag]
            );

            const [tagRows] = await connection.execute(
                `
                SELECT id
                FROM tags
                WHERE name = ?
                `,
                [normalizedTag]
            );

            if (tagRows.length > 0) {
                await connection.execute(
                    `
                    INSERT IGNORE INTO question_tags (
                        question_id,
                        tag_id
                    )
                    VALUES (?, ?)
                    `,
                    [
                        questionId,
                        tagRows[0].id
                    ]
                );
            }
        }

        await connection.commit();

        response.status(201).json({
            status: 'created',
            id: questionId
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            'Falha ao criar questão:',
            error.message
        );

        response.status(500).json({
            status: 'error',
            message: 'Não foi possível criar a questão.'
        });
    } finally {
        connection.release();
    }
});

/*
|--------------------------------------------------------------------------
| ATUALIZAR QUESTÃO
|--------------------------------------------------------------------------
*/

app.put('/api/questions/:id', async (request, response) => {
    const connection = await pool.getConnection();

    try {
        const questionId = Number(request.params.id);

        if (!Number.isInteger(questionId) || questionId <= 0) {
            return response.status(400).json({
                status: 'error',
                message: 'ID da questão inválido.'
            });
        }

        const {
            statement,
            teacherId = 1,
            tags = [],
            alternatives = [],
            correctAlternativeIndex
        } = request.body;

        if (!String(statement || '').trim()) {
            return response.status(400).json({
                status: 'error',
                message: 'O enunciado da questão é obrigatório.'
            });
        }

        if (!Array.isArray(alternatives) || alternatives.length < 2) {
            return response.status(400).json({
                status: 'error',
                message: 'A questão deve possuir pelo menos duas alternativas.'
            });
        }

        if (
            !Number.isInteger(correctAlternativeIndex) ||
            correctAlternativeIndex < 0 ||
            correctAlternativeIndex >= alternatives.length
        ) {
            return response.status(400).json({
                status: 'error',
                message: 'A alternativa correta é inválida.'
            });
        }

        await connection.beginTransaction();

        const [questionRows] = await connection.execute(
            `
            SELECT id
            FROM questions
            WHERE id = ?
            FOR UPDATE
            `,
            [questionId]
        );

        if (questionRows.length === 0) {
            await connection.rollback();

            return response.status(404).json({
                status: 'error',
                message: 'Questão não encontrada.'
            });
        }

        await connection.execute(
            `
            UPDATE questions
            SET
                teacher_id = ?,
                statement = ?
            WHERE id = ?
            `,
            [
                teacherId,
                String(statement).trim(),
                questionId
            ]
        );

        await connection.execute(
            `
            DELETE FROM question_tags
            WHERE question_id = ?
            `,
            [questionId]
        );

        await connection.execute(
            `
            DELETE FROM alternatives
            WHERE question_id = ?
            `,
            [questionId]
        );

        for (let index = 0; index < alternatives.length; index += 1) {
            const alternative = alternatives[index];

            await connection.execute(
                `
                INSERT INTO alternatives (
                    question_id,
                    position,
                    alternative_text,
                    is_correct
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    questionId,
                    index + 1,
                    String(alternative.text || '').trim(),
                    index === correctAlternativeIndex
                ]
            );
        }

        for (const tagName of tags) {
            const normalizedTag = String(tagName || '').trim();

            if (!normalizedTag) {
                continue;
            }

            await connection.execute(
                `
                INSERT INTO tags (name)
                VALUES (?)
                ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
                `,
                [normalizedTag]
            );

            const [tagRows] = await connection.execute(
                `
                SELECT id
                FROM tags
                WHERE name = ?
                `,
                [normalizedTag]
            );

            if (tagRows.length > 0) {
                await connection.execute(
                    `
                    INSERT IGNORE INTO question_tags (
                        question_id,
                        tag_id
                    )
                    VALUES (?, ?)
                    `,
                    [
                        questionId,
                        tagRows[0].id
                    ]
                );
            }
        }

        await connection.commit();

        response.json({
            status: 'updated',
            id: questionId
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            'Falha ao atualizar questão:',
            error.message
        );

        response.status(500).json({
            status: 'error',
            message: 'Não foi possível atualizar a questão.'
        });
    } finally {
        connection.release();
    }
});

// Rotas de turmas
app.use('/api/classes', classesRoutes);

/*
|--------------------------------------------------------------------------
| EXCLUIR QUESTÃO
|--------------------------------------------------------------------------
*/

app.delete('/api/questions/:id', async (request, response) => {
    const connection = await pool.getConnection();

    try {
        const questionId = Number(request.params.id);

        if (!Number.isInteger(questionId) || questionId <= 0) {
            return response.status(400).json({
                status: 'error',
                message: 'ID da questão inválido.'
            });
        }

        await connection.beginTransaction();

        const [questionRows] = await connection.execute(
            `
            SELECT id
            FROM questions
            WHERE id = ?
            FOR UPDATE
            `,
            [questionId]
        );

        if (questionRows.length === 0) {
            await connection.rollback();

            return response.status(404).json({
                status: 'error',
                message: 'Questão não encontrada.'
            });
        }

        await connection.execute(
            'DELETE FROM question_tags WHERE question_id = ?',
            [questionId]
        );

        await connection.execute(
            'DELETE FROM alternatives WHERE question_id = ?',
            [questionId]
        );

        await connection.execute(
            'DELETE FROM questions WHERE id = ?',
            [questionId]
        );

        await connection.commit();

        response.json({
            status: 'deleted',
            id: questionId
        });
    } catch (error) {
        await connection.rollback();

        console.error('Falha ao excluir questão:', error.message);

        response.status(500).json({
            status: 'error',
            message: 'Não foi possível excluir a questão.'
        });
    } finally {
        connection.release();
    }
});

/*
|--------------------------------------------------------------------------
| API 404
|--------------------------------------------------------------------------
*/

// Mantenha aqui o middleware de 404 já existente.

// Tratamento de erros (após as rotas e o 404)
app.use('/api/classes', handleApiError);

app.use('/api', (_request, response) => {
    response.status(404).json({
        status: 'error',
        message: 'Rota da API não encontrada.'
    });
});

/*
|--------------------------------------------------------------------------
| ARQUIVOS DO FRONT-END
|--------------------------------------------------------------------------
*/

const distPath = path.join(__dirname, '..', 'dist');

app.use(express.static(distPath));

app.get('*splat', (_request, response) => {
    response.sendFile(
        path.join(distPath, 'index.html')
    );
});

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = app;