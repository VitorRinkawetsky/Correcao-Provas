const database = require('../config/database');
const defaultRepository = require('../repositories/correctionsRepository');
const { ApiError } = require('../http/ApiError');

function positiveId(value, field) {
    const isNumericValue = typeof value === 'number'
        || (typeof value === 'string' && /^\d+$/.test(value));
    if (
        !isNumericValue
        || !Number.isSafeInteger(Number(value))
        || Number(value) < 1
    ) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Identificador invalido.',
            [{ field }]
        );
    }

    return Number(value);
}

function associationPayload(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Dados invalidos.',
            [{ field: 'studentId' }]
        );
    }

    const unexpected = Object.keys(body).filter((field) => field !== 'studentId');
    if (unexpected.length) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'O corpo deve conter somente o aluno selecionado.',
            unexpected.map((field) => ({ field }))
        );
    }

    if (typeof body.studentId !== 'number') {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'O identificador do aluno deve ser um numero inteiro positivo.',
            [{ field: 'studentId' }]
        );
    }

    return { studentId: positiveId(body.studentId, 'studentId') };
}

function normalizeSearch(value) {
    if (value == null) return '';
    if (typeof value !== 'string') {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Busca invalida.',
            [{ field: 'search' }]
        );
    }

    const search = value.trim();
    if (search.length > 150) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'A busca deve ter no maximo 150 caracteres.',
            [{ field: 'search' }]
        );
    }

    return search;
}

function strictBodyId(value, field) {
    if (typeof value !== 'number') {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Identificador invalido.',
            [{ field }]
        );
    }
    return positiveId(value, field);
}

function correctionPayload(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.');
    }

    const allowed = new Set([
        'examVersionId',
        'studentId',
        'status',
        'notes',
        'answers'
    ]);
    const unexpected = Object.keys(body).filter((field) => !allowed.has(field));
    if (unexpected.length) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'O corpo contem campos nao permitidos.',
            unexpected.map((field) => ({ field }))
        );
    }

    const examVersionId = strictBodyId(body.examVersionId, 'examVersionId');
    const studentId = strictBodyId(body.studentId, 'studentId');
    if (!['pending', 'confirmed'].includes(body.status)) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Status de correcao invalido.',
            [{ field: 'status' }]
        );
    }

    if (body.notes != null && typeof body.notes !== 'string') {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Observacao invalida.',
            [{ field: 'notes' }]
        );
    }
    const normalizedNotes = body.notes?.trim() || null;
    if (normalizedNotes && normalizedNotes.length > 5000) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'A observacao deve ter no maximo 5000 caracteres.',
            [{ field: 'notes' }]
        );
    }

    if (!Array.isArray(body.answers) || body.answers.length < 1 || body.answers.length > 500) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Informe as respostas da correcao.',
            [{ field: 'answers' }]
        );
    }

    const seenQuestions = new Set();
    const answers = body.answers.map((answer, index) => {
        const field = `answers[${index}]`;
        if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Resposta invalida.', [{ field }]);
        }

        const answerFields = Object.keys(answer);
        const expectedFields = new Set(['questionId', 'selectedAlternativeId']);
        const unexpectedAnswerFields = answerFields.filter(
            (answerField) => !expectedFields.has(answerField)
        );
        if (
            unexpectedAnswerFields.length
            || !answerFields.includes('questionId')
            || !answerFields.includes('selectedAlternativeId')
        ) {
            throw new ApiError(
                400,
                'VALIDATION_ERROR',
                'Resposta contem campos invalidos.',
                (unexpectedAnswerFields.length ? unexpectedAnswerFields : [field])
                    .map((answerField) => ({ field: answerField }))
            );
        }

        const questionId = strictBodyId(answer.questionId, `${field}.questionId`);
        let selectedAlternativeId = null;
        if (answer.selectedAlternativeId !== null) {
            selectedAlternativeId = strictBodyId(
                answer.selectedAlternativeId,
                `${field}.selectedAlternativeId`
            );
        }

        if (seenQuestions.has(questionId)) {
            throw new ApiError(
                400,
                'INVALID_ANSWERS',
                'Cada questao deve aparecer uma unica vez.',
                [{ field: `${field}.questionId` }]
            );
        }
        seenQuestions.add(questionId);

        return { questionId, selectedAlternativeId };
    });

    return {
        examVersionId,
        studentId,
        status: body.status,
        notes: normalizedNotes,
        answers
    };
}

function cents(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.round(amount * 100);
}

function buildQuestions(rows) {
    const questions = new Map();

    for (const row of rows) {
        const questionId = Number(row.questionId);
        if (!questions.has(questionId)) {
            questions.set(questionId, {
                questionId,
                order: Number(row.questionOrder),
                statement: row.statement,
                scoreCents: cents(row.score),
                alternatives: new Map()
            });
        }

        if (row.alternativeId != null) {
            questions.get(questionId).alternatives.set(Number(row.alternativeId), {
                id: Number(row.alternativeId),
                order: Number(row.alternativeOrder),
                text: row.alternativeText,
                isCorrect: Number(row.isCorrect) === 1
            });
        }
    }

    return questions;
}

function assertValidAnswerKey(questions) {
    const isValid = questions.size > 0 && [...questions.values()].every((question) => (
        question.scoreCents != null
        && question.alternatives.size >= 2
        && [...question.alternatives.values()].filter((alternative) => alternative.isCorrect)
            .length === 1
    ));

    if (!isValid) {
        throw new ApiError(
            409,
            'INVALID_ANSWER_KEY',
            'A versao nao possui um gabarito valido para correcao.'
        );
    }
}

function createCorrectionsService({
    repository = defaultRepository,
    database: databaseClient = database
} = {}) {
    async function ownedApplication(teacherId, applicationId) {
        const ownerId = positiveId(teacherId, 'teacherId');
        const id = positiveId(applicationId, 'applicationId');
        const application = await repository.findOwnedApplication(id, ownerId);

        if (!application) {
            throw new ApiError(404, 'NOT_FOUND', 'Aplicacao nao encontrada.');
        }

        return { ownerId, id, application };
    }

    async function listPending(teacherId, applicationId) {
        const { ownerId, id } = await ownedApplication(teacherId, applicationId);
        return repository.listPending(id, ownerId);
    }

    async function listCorrections(teacherId, query = {}) {
        if (!query || typeof query !== 'object' || Array.isArray(query)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Parametros invalidos.');
        }
        const { ownerId, id } = await ownedApplication(teacherId, query.applicationId);
        return repository.listCorrections(id, ownerId, normalizeSearch(query.search));
    }

    async function getFormOptions(teacherId, applicationId) {
        const { ownerId, id } = await ownedApplication(teacherId, applicationId);
        const [versions, students] = await Promise.all([
            repository.listVersions(id, ownerId),
            repository.listApplicationStudents(id, ownerId)
        ]);

        return { versions, students };
    }

    async function getVersionQuestions(teacherId, versionId) {
        const ownerId = positiveId(teacherId, 'teacherId');
        const id = positiveId(versionId, 'versionId');
        const version = await repository.findOwnedVersion(id, ownerId);
        if (!version) {
            throw new ApiError(404, 'NOT_FOUND', 'Versao nao encontrada.');
        }

        const questions = buildQuestions(
            await repository.listVersionAnswerKey(id, ownerId)
        );
        assertValidAnswerKey(questions);

        return {
            versionId: version.id,
            applicationId: version.applicationId,
            versionNumber: version.versionNumber,
            questions: [...questions.values()]
                .sort((left, right) => left.order - right.order)
                .map((question) => ({
                    questionId: question.questionId,
                    order: question.order,
                    statement: question.statement,
                    score: question.scoreCents / 100,
                    alternatives: [...question.alternatives.values()]
                        .sort((left, right) => left.order - right.order)
                        .map(({ id: alternativeId, order, text }) => ({
                            id: alternativeId,
                            order,
                            text
                        }))
                }))
        };
    }

    async function createCorrection(teacherId, body) {
        const ownerId = positiveId(teacherId, 'teacherId');
        const payload = correctionPayload(body);

        try {
            return await databaseClient.withTransaction(async (transaction) => {
                const version = await repository.findOwnedVersionForUpdate(
                    payload.examVersionId,
                    ownerId,
                    transaction
                );
                if (!version) {
                    throw new ApiError(404, 'NOT_FOUND', 'Versao nao encontrada.');
                }

                const student = await repository.findStudentForUpdate(
                    payload.studentId,
                    version.classId,
                    transaction
                );
                if (!student) {
                    throw new ApiError(
                        404,
                        'NOT_FOUND',
                        'Aluno ativo nao encontrado na turma desta aplicacao.'
                    );
                }

                const questions = buildQuestions(
                    await repository.listVersionAnswerKey(version.id, ownerId, transaction)
                );
                assertValidAnswerKey(questions);

                if (payload.answers.length !== questions.size) {
                    throw new ApiError(
                        400,
                        'INVALID_ANSWERS',
                        'Informe exatamente uma resposta para cada questao da versao.',
                        [{ field: 'answers' }]
                    );
                }

                let totalCents = 0;
                const scoredAnswers = payload.answers.map((answer, index) => {
                    const question = questions.get(answer.questionId);
                    if (!question) {
                        throw new ApiError(
                            400,
                            'INVALID_ANSWERS',
                            'A resposta nao pertence a esta versao.',
                            [{ field: `answers[${index}].questionId` }]
                        );
                    }

                    const alternative = answer.selectedAlternativeId == null
                        ? null
                        : question.alternatives.get(answer.selectedAlternativeId);
                    if (answer.selectedAlternativeId != null && !alternative) {
                        throw new ApiError(
                            400,
                            'INVALID_ANSWERS',
                            'A alternativa nao pertence a esta questao e versao.',
                            [{ field: `answers[${index}].selectedAlternativeId` }]
                        );
                    }

                    const isCorrect = Boolean(alternative?.isCorrect);
                    const awardedCents = isCorrect ? question.scoreCents : 0;
                    totalCents += awardedCents;

                    return {
                        questionId: answer.questionId,
                        selectedAlternativeId: answer.selectedAlternativeId,
                        isCorrect,
                        awardedScore: awardedCents / 100
                    };
                });

                const assignment = await repository.findAssignment(
                    version.id,
                    student.id,
                    transaction
                );
                const assignmentId = assignment?.id ?? null;
                const conflict = await repository.findCorrectionConflict(
                    version.id,
                    student.id,
                    assignmentId,
                    transaction
                );
                if (conflict) {
                    throw new ApiError(
                        409,
                        'CORRECTION_CONFLICT',
                        'Ja existe uma correcao para este aluno nesta versao.'
                    );
                }

                const correctionId = await repository.insertCorrection({
                    examAssignmentId: assignmentId,
                    examVersionId: version.id,
                    studentId: student.id,
                    status: payload.status,
                    totalScore: totalCents / 100,
                    notes: payload.notes,
                    correctedBy: ownerId
                }, transaction);
                await repository.insertCorrectionAnswers(
                    correctionId,
                    scoredAnswers,
                    transaction
                );

                const created = await repository.findCorrectionById(
                    correctionId,
                    ownerId,
                    transaction
                );
                if (!created) throw new Error('Correcao criada nao foi encontrada.');
                return created;
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ApiError(
                    409,
                    'CORRECTION_CONFLICT',
                    'Ja existe uma correcao para este aluno nesta versao.'
                );
            }
            throw error;
        }
    }

    async function listStudents(teacherId, applicationId) {
        const { ownerId, id } = await ownedApplication(teacherId, applicationId);
        return repository.listApplicationStudents(id, ownerId);
    }

    async function associateStudent(teacherId, correctionId, body) {
        const ownerId = positiveId(teacherId, 'teacherId');
        const id = positiveId(correctionId, 'correctionId');
        const { studentId } = associationPayload(body);

        try {
            return await databaseClient.withTransaction(async (transaction) => {
                const correction = await repository.findCorrectionForUpdate(
                    id,
                    ownerId,
                    transaction
                );

                if (!correction) {
                    throw new ApiError(404, 'NOT_FOUND', 'Correcao nao encontrada.');
                }

                if (correction.studentId != null || correction.examAssignmentId != null) {
                    throw new ApiError(
                        409,
                        'CORRECTION_ALREADY_ASSOCIATED',
                        'A correcao ja esta associada a um aluno.'
                    );
                }

                const student = await repository.findStudentForUpdate(
                    studentId,
                    correction.classId,
                    transaction
                );

                if (!student) {
                    throw new ApiError(
                        404,
                        'NOT_FOUND',
                        'Aluno ativo nao encontrado na turma desta aplicacao.'
                    );
                }

                const reportedRegistration = String(
                    correction.reportedStudentRegistration ?? ''
                ).trim();
                const studentRegistration = String(student.registration ?? '').trim();

                if (!reportedRegistration || studentRegistration !== reportedRegistration) {
                    throw new ApiError(
                        409,
                        'REGISTRATION_MISMATCH',
                        'A matricula do aluno nao corresponde a informada na correcao.',
                        [{ field: 'studentId' }]
                    );
                }

                const assignment = await repository.findAssignment(
                    correction.examVersionId,
                    student.id,
                    transaction
                );
                const assignmentId = assignment?.id ?? null;
                const conflict = await repository.findAssociationConflict(
                    correction.id,
                    correction.examVersionId,
                    student.id,
                    assignmentId,
                    transaction
                );

                if (conflict) {
                    throw new ApiError(
                        409,
                        'CORRECTION_ASSOCIATION_CONFLICT',
                        'Ja existe uma correcao para este aluno nesta versao.'
                    );
                }

                const affectedRows = await repository.updateAssociation(
                    correction.id,
                    student.id,
                    assignmentId,
                    transaction
                );

                if (affectedRows !== 1) {
                    throw new ApiError(
                        409,
                        'CORRECTION_ALREADY_ASSOCIATED',
                        'A correcao ja esta associada a um aluno.'
                    );
                }

                return {
                    id: correction.id,
                    applicationId: correction.applicationId,
                    examVersionId: correction.examVersionId,
                    studentId: student.id,
                    examAssignmentId: assignmentId,
                    reportedStudentName: correction.reportedStudentName,
                    reportedStudentRegistration: correction.reportedStudentRegistration,
                    status: correction.status,
                    totalScore: correction.totalScore,
                    createdAt: correction.createdAt
                };
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ApiError(
                    409,
                    'CORRECTION_ASSOCIATION_CONFLICT',
                    'Ja existe uma correcao para este aluno nesta versao.'
                );
            }
            throw error;
        }
    }

    return {
        listCorrections,
        getFormOptions,
        getVersionQuestions,
        createCorrection,
        listPending,
        listStudents,
        associateStudent
    };
}

const service = createCorrectionsService();

module.exports = { ...service, createCorrectionsService };
