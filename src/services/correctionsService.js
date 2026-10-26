const database = require('../config/database');
const defaultRepository = require('../repositories/correctionsRepository');
const { ApiError } = require('../http/ApiError');

const normalizeCode = (value) => String(value || '').trim();

function qrCorrectionPayload(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.');
    }

    const allowed = new Set([
        'qrCodePayload',
        'studentName',
        'studentRegistration',
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

    if (typeof body.qrCodePayload !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Codigo QR invalido.', [
            { field: 'qrCodePayload' }
        ]);
    }
    const qrCodePayload = normalizeCode(body.qrCodePayload);
    if (!qrCodePayload || qrCodePayload.length > 500) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Codigo QR invalido.', [
            { field: 'qrCodePayload' }
        ]);
    }

    const normalizeOptionalText = (field, maxLength) => {
        if (body[field] == null) return null;
        if (typeof body[field] !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.', [{ field }]);
        }
        const value = body[field].trim();
        if (value.length > maxLength) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.', [{ field }]);
        }
        return value || null;
    };

    if (body.answers != null && !Array.isArray(body.answers)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [
            { field: 'answers' }
        ]);
    }
    const answers = (body.answers || []).map((answer, index) => {
        const field = `answers.${index}`;
        if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [{ field }]);
        }
        const answerFields = Object.keys(answer);
        if (answerFields.some((key) => !['questionId', 'selectedAlternativeId'].includes(key))) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [{ field }]);
        }
        const questionId = strictBodyId(answer.questionId, `${field}.questionId`);
        const selectedAlternativeId = answer.selectedAlternativeId == null
            ? null
            : strictBodyId(
                answer.selectedAlternativeId,
                `${field}.selectedAlternativeId`
            );
        return { questionId, selectedAlternativeId };
    });

    return {
        qrCodePayload,
        studentName: normalizeOptionalText('studentName', 150),
        studentRegistration: normalizeOptionalText('studentRegistration', 40),
        notes: normalizeOptionalText('notes', 5000),
        answers
    };
}

function correctionUpdatePayload(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.');
    }

    const allowed = new Set(['studentName', 'studentRegistration', 'notes', 'answers']);
    const unexpected = Object.keys(body).filter((field) => !allowed.has(field));
    if (unexpected.length) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'O corpo contem campos nao permitidos.',
            unexpected.map((field) => ({ field }))
        );
    }

    const normalizeOptionalText = (field, maxLength) => {
        if (body[field] == null) return null;
        if (typeof body[field] !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.', [{ field }]);
        }
        const value = body[field].trim();
        if (value.length > maxLength) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos.', [{ field }]);
        }
        return value || null;
    };

    if (!Array.isArray(body.answers)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [
            { field: 'answers' }
        ]);
    }

    const seenQuestions = new Set();
    const answers = body.answers.map((answer, index) => {
        const field = `answers.${index}`;
        if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [{ field }]);
        }
        const keys = Object.keys(answer);
        const unexpectedAnswerFields = keys.filter(
            (key) => !['questionId', 'selectedAlternativeId'].includes(key)
        );
        if (
            unexpectedAnswerFields.length
            || !Object.hasOwn(answer, 'questionId')
            || !Object.hasOwn(answer, 'selectedAlternativeId')
        ) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [{ field }]);
        }

        const questionId = strictBodyId(answer.questionId, `${field}.questionId`);
        if (seenQuestions.has(questionId)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [{
                field: `${field}.questionId`,
                message: 'A questao foi enviada mais de uma vez'
            }]);
        }
        seenQuestions.add(questionId);

        const selectedAlternativeId = answer.selectedAlternativeId == null
            ? null
            : strictBodyId(
                answer.selectedAlternativeId,
                `${field}.selectedAlternativeId`
            );
        return { questionId, selectedAlternativeId };
    });

    return {
        studentName: normalizeOptionalText('studentName', 150),
        studentRegistration: normalizeOptionalText('studentRegistration', 40),
        notes: normalizeOptionalText('notes', 5000),
        answers
    };
}

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

                const created = await repository.findCorrectionSummaryById(
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


    async function getContext(code, teacherId) {
        const ownerId = positiveId(teacherId, 'teacherId');
        const normalizedCode = normalizeCode(code);
        if (!normalizedCode) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Informe o codigo da prova');
        }

        const context = await repository.findCorrectionContext(normalizedCode, ownerId);
        if (!context) {
            throw new ApiError(
                404,
                'INVALID_QR_CODE',
                'Codigo invalido ou prova nao pertencente ao professor'
            );
        }

        return context;
    }

    async function correct(teacherId, body) {
        const ownerId = positiveId(teacherId, 'teacherId');
        const payload = qrCorrectionPayload(body);
        const context = await getContext(payload.qrCodePayload, ownerId);
        const studentName = String(
            payload.studentName || context.assignedStudentName || ''
        ).trim();
        const studentRegistration = String(
            payload.studentRegistration || context.assignedStudentRegistration || ''
        ).trim();
        const answers = payload.answers;

        if (!studentRegistration && !context.assignedStudentId) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Informe a matricula do aluno');
        }

        const details = [];
        const answersByQuestion = new Map();
        answers.forEach((answer) => {
            if (answersByQuestion.has(answer.questionId)) {
                details.push({
                    field: `answers.${answer.questionId}`,
                    message: 'A questao foi enviada mais de uma vez'
                });
            }
            answersByQuestion.set(answer.questionId, answer);
        });
        [...answersByQuestion.keys()].forEach((questionId) => {
            if (!context.questions.some(
                (question) => Number(question.questionId) === Number(questionId)
            )) {
                details.push({
                    field: 'answers',
                    message: 'A resposta referencia uma questao que nao pertence a versao'
                });
            }
        });
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

        return databaseClient.withTransaction(async (transaction) => {
            const answerKey = await repository.findQrAnswerKey(
                context.applicationId,
                context.examVersionId,
                transaction
            );
            const keyByQuestion = new Map(
                answerKey.map((row) => [Number(row.questionId), row])
            );
            let totalScore = 0;

            normalizedAnswers.forEach((answer) => {
                const key = keyByQuestion.get(Number(answer.questionId));
                answer.isCorrect = Boolean(
                    key
                    && Number(key.correctAlternativeId)
                        === Number(answer.selectedAlternativeId)
                );
                answer.awardedScore = answer.isCorrect ? Number(key.score) : 0;
                totalScore += answer.awardedScore;
            });

            const correctionId = await repository.insertQrCorrection({
                assignmentId: context.assignmentId || null,
                examVersionId: context.examVersionId,
                studentId: context.assignedStudentId || null,
                studentName: studentName || null,
                studentRegistration: studentRegistration || null,
                totalScore,
                answers: normalizedAnswers,
                teacherId: ownerId,
                notes: payload.notes
            }, transaction);

            return {
                id: correctionId,
                examVersionId: context.examVersionId,
                studentName,
                studentRegistration,
                totalScore,
                answers: normalizedAnswers
            };
        });
    }

    async function getCorrection(id, teacherId) {
        const correctionId = positiveId(id, 'correctionId');
        const ownerId = positiveId(teacherId, 'teacherId');
        const correction = await repository.findCorrectionById(correctionId, ownerId);
        if (!correction) {
            throw new ApiError(404, 'NOT_FOUND', 'Correcao nao encontrada');
        }
        return correction;
    }

    async function update(id, teacherId, body) {
        const correctionId = positiveId(id, 'correctionId');
        const ownerId = positiveId(teacherId, 'teacherId');
        const payload = correctionUpdatePayload(body);
        const current = await getCorrection(correctionId, ownerId);
        const answers = payload.answers;
        if (answers.length !== current.questions.length) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Respostas invalidas.', [{
                field: 'answers',
                message: 'Informe exatamente uma resposta para cada questao da versao'
            }]);
        }
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
        if (unknownQuestion !== undefined) {
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
        const studentName = String(payload.studentName || current.studentName || '').trim();
        const studentRegistration = String(
            payload.studentRegistration || current.studentRegistration || ''
        ).trim();

        if (!studentRegistration && !current.studentId) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Informe a matricula do aluno');
        }

        await databaseClient.withTransaction((transaction) => repository.updateCorrection(
            correctionId,
            {
                teacherId: ownerId,
                studentName,
                studentRegistration,
                totalScore,
                notes: payload.notes,
                answers: normalizedAnswers
            },
            transaction
        ));

        return getCorrection(correctionId, ownerId);
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
        getContext,
        correct,
        getCorrection,
        update,
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
