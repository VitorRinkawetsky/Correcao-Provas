const { pool } = require('../config/database');
const repository = require('../repositories/correctionsRepository');
const { ApiError } = require('../http/ApiError');

const normalizeCode = (value) => String(value || '').trim();

const positiveId = (value) => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Identificador de correcao invalido');
    }
    return id;
};

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

const getCorrection = async (id, teacherId) => {
    const correction = await repository.findCorrectionById(positiveId(id), teacherId);
    if (!correction) {
        throw new ApiError(404, 'NOT_FOUND', 'Correcao nao encontrada');
    }
    return correction;
};

const update = async (id, teacherId, body) => {
    const correctionId = positiveId(id);
    const current = await getCorrection(correctionId, teacherId);
    const answers = Array.isArray(body?.answers) ? body.answers : [];
    const answerByQuestion = new Map();
    const details = [];

    answers.forEach((answer) => {
        const questionId = Number(answer?.questionId);
        if (answerByQuestion.has(questionId)) {
            details.push({
                field: `answers.${questionId}`,
                message: 'A questao foi enviada mais de uma vez'
            });
        }
        answerByQuestion.set(questionId, answer);
    });

    const normalizedAnswers = current.questions.map((question) => {
        const answer = answerByQuestion.get(Number(question.questionId));
        const selectedAlternativeId = answer?.selectedAlternativeId
            ? Number(answer.selectedAlternativeId)
            : null;
        const selectedAlternative = question.alternatives.find(
            (alternative) => Number(alternative.id) === selectedAlternativeId
        );

        if (answer && selectedAlternativeId && !selectedAlternative) {
            details.push({
                field: `answers.${question.questionId}`,
                message: 'A alternativa nao pertence a versao recebida'
            });
        }

        return {
            questionId: question.questionId,
            selectedAlternativeId: selectedAlternative ? selectedAlternative.id : null,
            isCorrect: Boolean(selectedAlternative?.isCorrect),
            awardedScore: selectedAlternative?.isCorrect ? question.score : 0
        };
    });

    const unknownQuestion = [...answerByQuestion.keys()].find(
        (questionId) => !current.questions.some(
            (question) => Number(question.questionId) === questionId
        )
    );
    if (unknownQuestion) {
        details.push({
            field: 'answers',
            message: 'A resposta referencia uma questao que nao pertence a versao'
        });
    }

    if (details.length > 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas', details);
    }

    const totalScore = normalizedAnswers.reduce(
        (total, answer) => total + answer.awardedScore,
        0
    );
    const studentName = String(
        body?.studentName || current.studentName || ''
    ).trim();
    const studentRegistration = String(
        body?.studentRegistration || current.studentRegistration || ''
    ).trim();

    if (!studentRegistration && !current.studentId) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Informe a matricula do aluno');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await repository.updateCorrection(correctionId, {
            teacherId,
            studentName,
            studentRegistration,
            totalScore,
            notes: body?.notes,
            answers: normalizedAnswers
        }, connection);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    return getCorrection(correctionId, teacherId);
};

module.exports = {
    getContext,
    correct,
    getCorrection,
    update
};
