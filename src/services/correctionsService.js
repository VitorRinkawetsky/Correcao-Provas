const { pool } = require('../config/database');
const repository = require('../repositories/correctionsRepository');
const { ApiError } = require('../http/ApiError');

const normalizeCode = (value) => String(value || '').trim();

const getContext = async (code, teacherId) => {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Informe o codigo da prova');
    }

    const context = await repository.findCorrectionContext(normalizedCode, teacherId);
    if (!context) {
        throw new ApiError(
            404,
            'INVALID_QR_CODE',
            'Codigo invalido ou prova nao pertencente ao professor'
        );
    }

    return context;
};

const correct = async (teacherId, body) => {
    const context = await getContext(body?.qrCodePayload, teacherId);
    const studentName = String(body?.studentName || context.assignedStudentName || '').trim();
    const studentRegistration = String(
        body?.studentRegistration || context.assignedStudentRegistration || ''
    ).trim();
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    if (!studentRegistration && !context.assignedStudentId) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Informe a matricula do aluno'
        );
    }

    const answersByQuestion = new Map(
        answers.map((answer) => [Number(answer?.questionId), answer])
    );
    const details = [];
    const normalizedAnswers = context.questions.map((question) => {
        const answer = answersByQuestion.get(Number(question.questionId));
        const selectedAlternativeId = answer?.selectedAlternativeId
            ? Number(answer.selectedAlternativeId)
            : null;
        const selectedAlternative = question.alternatives.find(
            (alternative) => Number(alternative.id) === selectedAlternativeId
        );

        if (answer && selectedAlternativeId && !selectedAlternative) {
            details.push({
                field: `answers.${question.questionId}`,
                message: 'Alternativa invalida para a questao'
            });
        }

        return {
            questionId: question.questionId,
            selectedAlternativeId: selectedAlternative ? selectedAlternative.id : null,
            isCorrect: false,
            awardedScore: 0
        };
    });

    if (details.length > 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas', details);
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [answerKey] = await connection.execute(`
            SELECT
                versionQuestion.question_id AS questionId,
                alternative.id AS correctAlternativeId,
                examQuestion.score
            FROM exam_version_questions AS versionQuestion
            INNER JOIN exam_questions AS examQuestion
                ON examQuestion.exam_id = (
                    SELECT exam_id FROM applications WHERE id = ?
                )
                AND examQuestion.question_id = versionQuestion.question_id
            INNER JOIN alternatives AS alternative
                ON alternative.question_id = versionQuestion.question_id
                AND alternative.is_correct = TRUE
            WHERE versionQuestion.exam_version_id = ?
        `, [context.applicationId, context.examVersionId]);

        const keyByQuestion = new Map(
            answerKey.map((row) => [Number(row.questionId), row])
        );
        let totalScore = 0;

        normalizedAnswers.forEach((answer) => {
            const key = keyByQuestion.get(Number(answer.questionId));
            answer.isCorrect = Boolean(
                key && Number(key.correctAlternativeId) === Number(answer.selectedAlternativeId)
            );
            answer.awardedScore = answer.isCorrect ? Number(key.score) : 0;
            totalScore += answer.awardedScore;
        });

        const correctionId = await repository.insertCorrection({
            assignmentId: context.assignmentId || null,
            examVersionId: context.examVersionId,
            studentId: context.assignedStudentId || null,
            studentName: studentName || null,
            studentRegistration: studentRegistration || null,
            totalScore,
            answers: normalizedAnswers,
            teacherId
        }, connection);

        await connection.commit();
        return {
            id: correctionId,
            examVersionId: context.examVersionId,
            studentName,
            studentRegistration,
            totalScore,
            answers: normalizedAnswers
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    getContext,
    correct
};
