const { pool } = require('../config/database');
const repository = require('../repositories/examsRepository');
const { ApiError } = require('../http/ApiError');

const MAX_QUESTIONS = 20;

const positiveId = (value, field = 'id') => {
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Identificador invalido', [{ field }]);
    }
    return Number(value);
};

const validatePayload = async (body, teacherId, db) => {
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const questions = Array.isArray(body?.questions) ? body.questions : [];

    const details = [];
    if (!title || title.length > 180) {
        details.push({ field: 'title', message: 'Informe um titulo com ate 180 caracteres' });
    }
    if (questions.length > MAX_QUESTIONS) {
        details.push({
            field: 'questions',
            message: `A prova pode possuir no maximo ${MAX_QUESTIONS} questoes`
        });
    }

    const normalizedQuestions = questions.map((question, index) => ({
        questionId: positiveId(question?.questionId, `questions.${index}.questionId`),
        score: Number(question?.score),
        order: index + 1
    }));

    normalizedQuestions.forEach((question, index) => {
        if (!Number.isFinite(question.score) || question.score <= 0) {
            details.push({ field: `questions.${index}.score`, message: 'A pontuacao deve ser maior que zero' });
        }
    });

    const duplicatedIds = normalizedQuestions
        .map((question) => question.questionId)
        .filter((questionId, index, ids) => ids.indexOf(questionId) !== index);

    if (duplicatedIds.length > 0) {
        details.push({ field: 'questions', message: 'A mesma questao nao pode aparecer duas vezes' });
    }

    const ownedQuestionIds = await repository.listOwnedQuestionIds(
        teacherId,
        normalizedQuestions.map((question) => question.questionId),
        db
    );
    const ownedSet = new Set(ownedQuestionIds);
    const missingQuestion = normalizedQuestions.find((question) => !ownedSet.has(question.questionId));
    if (missingQuestion) {
        details.push({ field: 'questions', message: 'Uma ou mais questoes nao foram encontradas' });
    }

    if (details.length > 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos para salvar a prova', details);
    }

    return {
        title,
        description,
        questions: normalizedQuestions
    };
};

const transaction = async (work) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const buildDetails = async (exam, db = pool) => {
    const questions = await repository.listExamQuestions(exam.id, db);
    return {
        ...exam,
        questions,
        questionCount: questions.length,
        totalScore: questions.reduce((total, question) => total + Number(question.score || 0), 0)
    };
};

const list = (teacherId) => repository.listExams(teacherId);

const details = async (id, teacherId) => {
    const exam = await repository.findExam(positiveId(id), teacherId);
    if (!exam) throw new ApiError(404, 'NOT_FOUND', 'Prova nao encontrada');
    return buildDetails(exam);
};

const create = (teacherId, body) => transaction(async (db) => {
    const data = await validatePayload(body, teacherId, db);
    const id = await repository.insertExam(teacherId, data, db);
    await repository.replaceExamQuestions(id, data.questions, db);
    const exam = await repository.findExam(id, teacherId, db);
    return buildDetails(exam, db);
});

const update = (id, teacherId, body) => transaction(async (db) => {
    const examId = positiveId(id);
    const current = await repository.findExam(examId, teacherId, db, true);
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'Prova nao encontrada');
    if (current.status === 'closed' || current.status === 'archived') {
        throw new ApiError(
            409,
            'EXAM_LOCKED',
            'Provas fechadas ou arquivadas nao podem ser editadas'
        );
    }
    if (await repository.hasApplications(examId, db)) {
        throw new ApiError(
            409,
            'EXAM_LOCKED',
            'Provas que ja possuem aplicacoes nao podem ser editadas'
        );
    }

    const data = await validatePayload(body, teacherId, db);
    await repository.updateExam(examId, teacherId, data, db);
    await repository.replaceExamQuestions(examId, data.questions, db);
    const exam = await repository.findExam(examId, teacherId, db);
    return buildDetails(exam, db);
});

const archive = (id, teacherId) => transaction(async (db) => {
    const examId = positiveId(id);
    const current = await repository.findExam(examId, teacherId, db, true);
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'Prova nao encontrada');

    await repository.archiveExam(examId, teacherId, db);
});

module.exports = {
    list,
    details,
    create,
    update,
    archive
};
