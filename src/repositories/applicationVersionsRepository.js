
const { pool } = require('../config/database');
const crypto = require('crypto');

async function findAnswerKey(versionId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            ev.id AS versionId,
            ev.version_number AS versionNumber,
            a.id AS applicationId,
            e.title AS examTitle,
            evq.question_id AS questionId,
            evq.printed_order AS questionOrder,
            eva.printed_order AS alternativeOrder,
            alt.alternative_text AS alternativeText,
            alt.is_correct AS isCorrect
        FROM exam_versions ev
        INNER JOIN applications a ON a.id = ev.application_id
        INNER JOIN exams e ON e.id = a.exam_id
        LEFT JOIN exam_version_questions evq
            ON evq.exam_version_id = ev.id
        LEFT JOIN exam_version_alternatives eva
            ON eva.exam_version_id = evq.exam_version_id
            AND eva.question_id = evq.question_id
        LEFT JOIN alternatives alt
            ON alt.id = eva.alternative_id
            AND alt.question_id = evq.question_id
        WHERE ev.id = ? AND a.teacher_id = ?
        ORDER BY evq.printed_order ASC, eva.printed_order ASC`,
        [versionId, teacherId]
    );

    return rows;
}

async function listVersions(applicationId, teacherId, db = pool) {
    const [rows] = await db.execute(
        `SELECT
            ev.id,
            ev.application_id AS applicationId,
            ev.version_number AS versionNumber,
            ev.shuffle_questions AS shuffleQuestions,
            ev.shuffle_alternatives AS shuffleAlternatives,
            ev.with_student_identification AS withStudentIdentification,
            ev.created_at AS createdAt
         FROM exam_versions ev
         INNER JOIN applications a ON a.id = ev.application_id
         WHERE a.id = ? AND a.teacher_id = ?
         ORDER BY ev.version_number ASC`,
        [applicationId, teacherId]
    );

    return rows;
}

function embaralhar(lista) {
    const resultado = [...lista];

    for (let i = resultado.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
    }

    return resultado;
}

async function generateVersions(applicationId, teacherId, configs) {
    const db = await pool.getConnection();

    try {
        await db.beginTransaction();

        const [applications] = await db.execute(
            `SELECT a.id, a.exam_id AS examId
             FROM applications a
             WHERE a.id = ? AND a.teacher_id = ?
             FOR UPDATE`,
            [applicationId, teacherId]
        );

        if (!applications.length) {
            const error = new Error('Aplicação não encontrada.');
            error.statusCode = 404;
            throw error;
        }

        const examId = applications[0].examId;

        const [questionRows] = await db.execute(
            `SELECT
                q.id AS questionId,
                eq.question_order AS questionOrder,
                alt.id AS alternativeId,
                alt.position AS alternativePosition,
                alt.is_correct AS isCorrect
             FROM exam_questions eq
             INNER JOIN questions q ON q.id = eq.question_id
             LEFT JOIN alternatives alt ON alt.question_id = q.id
             WHERE eq.exam_id = ? AND q.teacher_id = ?
             ORDER BY eq.question_order ASC, alt.position ASC`,
            [examId, teacherId]
        );

        const questionsMap = new Map();

        for (const row of questionRows) {
            if (!questionsMap.has(row.questionId)) {
                questionsMap.set(row.questionId, {
                    id: row.questionId,
                    order: Number(row.questionOrder),
                    alternatives: []
                });
            }

            if (row.alternativeId != null) {
                questionsMap.get(row.questionId).alternatives.push({
                    id: row.alternativeId,
                    position: Number(row.alternativePosition),
                    correct: Boolean(row.isCorrect)
                });
            }
        }

        const questions = [...questionsMap.values()];

        if (questions.length === 0) {
            const error = new Error('A prova não possui questões.');
            error.statusCode = 400;
            throw error;
        }

        for (const question of questions) {
            if (
                question.alternatives.length < 2 ||
                !question.alternatives.some((alternative) => alternative.correct)
            ) {
                const error = new Error(
                    `A questão ${question.id} precisa ter pelo menos duas alternativas e uma resposta correta.`
                );
                error.statusCode = 400;
                throw error;
            }
        }

        const [maxRows] = await db.execute(
            `SELECT COALESCE(MAX(version_number), 0) AS lastNumber
             FROM exam_versions
             WHERE application_id = ?`,
            [applicationId]
        );

        let versionNumber = Number(maxRows[0].lastNumber) + 1;
        const created = [];

        for (const config of configs) {
            const publicCode = crypto.randomUUID();
            const qrPayload = JSON.stringify({
                applicationId,
                versionNumber,
                code: publicCode
            });

            const [versionResult] = await db.execute(
                `INSERT INTO exam_versions (
                    application_id,
                    version_number,
                    shuffle_questions,
                    shuffle_alternatives,
                    with_student_identification,
                    public_code,
                    qr_code_payload
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    applicationId,
                    versionNumber,
                    config.embaralharQuestoes ? 1 : 0,
                    config.embaralharAlternativas ? 1 : 0,
                    config.identificacao ? 1 : 0,
                    publicCode,
                    qrPayload
                ]
            );

            const versionId = versionResult.insertId;

            const orderedQuestions = config.embaralharQuestoes
                ? embaralhar(questions)
                : [...questions].sort((a, b) => a.order - b.order);

            await db.query(
                `INSERT INTO exam_version_questions (
                    exam_version_id,
                    question_id,
                    printed_order
                ) VALUES ?`,
                [
                    orderedQuestions.map((question, index) => [
                        versionId,
                        question.id,
                        index + 1
                    ])
                ]
            );

            const alternativeValues = [];

            for (const question of orderedQuestions) {
                const alternatives = config.embaralharAlternativas
                    ? embaralhar(question.alternatives)
                    : [...question.alternatives].sort(
                        (a, b) => a.position - b.position
                    );

                alternatives.forEach((alternative, index) => {
                    alternativeValues.push([
                        versionId,
                        question.id,
                        alternative.id,
                        index + 1
                    ]);
                });
            }

            if (alternativeValues.length > 0) {
                await db.query(
                    `INSERT INTO exam_version_alternatives (
                        exam_version_id,
                        question_id,
                        alternative_id,
                        printed_order
                    ) VALUES ?`,
                    [alternativeValues]
                );
            }

            created.push({
                id: versionId,
                applicationId,
                versionNumber,
                publicCode
            });

            versionNumber++;
        }

        await db.commit();
        return created;
    } catch (error) {
        await db.rollback();
        throw error;
    } finally {
        db.release();
    }
}

module.exports = {
    findAnswerKey,
    generateVersions,
    listVersions
};
