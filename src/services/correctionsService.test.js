import { beforeEach, describe, expect, it, vi } from 'vitest';

import correctionsService from './correctionsService';

const { createCorrectionsService } = correctionsService;

const correction = (overrides = {}) => ({
    id: 17,
    applicationId: 9,
    classId: 4,
    examVersionId: 12,
    studentId: null,
    examAssignmentId: null,
    reportedStudentName: 'Ana informada na prova',
    reportedStudentRegistration: '20260042',
    status: 'confirmed',
    totalScore: 8.5,
    createdAt: '2026-10-25T12:00:00.000Z',
    ...overrides
});

const student = (overrides = {}) => ({
    id: 31,
    fullName: 'Ana Souza',
    registration: '20260042',
    ...overrides
});

const answerKey = () => [
    {
        questionId: 101,
        questionOrder: 1,
        statement: 'Questao um',
        score: 1.25,
        alternativeId: 1001,
        alternativeOrder: 1,
        alternativeText: 'A',
        isCorrect: 1
    },
    {
        questionId: 101,
        questionOrder: 1,
        statement: 'Questao um',
        score: 1.25,
        alternativeId: 1002,
        alternativeOrder: 2,
        alternativeText: 'B',
        isCorrect: 0
    },
    {
        questionId: 102,
        questionOrder: 2,
        statement: 'Questao dois',
        score: 2.5,
        alternativeId: 1003,
        alternativeOrder: 1,
        alternativeText: 'A',
        isCorrect: 0
    },
    {
        questionId: 102,
        questionOrder: 2,
        statement: 'Questao dois',
        score: 2.5,
        alternativeId: 1004,
        alternativeOrder: 2,
        alternativeText: 'B',
        isCorrect: 1
    }
];

const creationPayload = (overrides = {}) => ({
    examVersionId: 12,
    studentId: 31,
    status: 'confirmed',
    notes: 'Revisar a segunda questao.',
    answers: [
        { questionId: 101, selectedAlternativeId: 1001 },
        { questionId: 102, selectedAlternativeId: null }
    ],
    ...overrides
});

const createHarness = (overrides = {}) => {
    const repository = {
        findOwnedApplication: vi.fn().mockResolvedValue({ id: 9, classId: 4 }),
        listCorrections: vi.fn().mockResolvedValue([correction({ studentId: 31 })]),
        listVersions: vi.fn().mockResolvedValue([{ id: 12, versionNumber: 1 }]),
        listPending: vi.fn().mockResolvedValue([correction()]),
        listApplicationStudents: vi.fn().mockResolvedValue([student()]),
        findOwnedVersion: vi.fn().mockResolvedValue({
            id: 12,
            applicationId: 9,
            classId: 4,
            versionNumber: 1
        }),
        findOwnedVersionForUpdate: vi.fn().mockResolvedValue({
            id: 12,
            applicationId: 9,
            classId: 4,
            versionNumber: 1
        }),
        listVersionAnswerKey: vi.fn().mockResolvedValue(answerKey()),
        findCorrectionForUpdate: vi.fn().mockResolvedValue(correction()),
        findStudentForUpdate: vi.fn().mockResolvedValue(student()),
        findAssignment: vi.fn().mockResolvedValue({ id: 55 }),
        findCorrectionConflict: vi.fn().mockResolvedValue(null),
        findAssociationConflict: vi.fn().mockResolvedValue(null),
        insertCorrection: vi.fn().mockResolvedValue(88),
        insertCorrectionAnswers: vi.fn().mockResolvedValue(2),
        findCorrectionById: vi.fn().mockResolvedValue(correction({
            id: 88,
            studentId: 31,
            examAssignmentId: 55,
            totalScore: 1.25
        })),
        updateAssociation: vi.fn().mockResolvedValue(1),
        ...overrides
    };
    const transaction = { name: 'transaction' };
    const transactionState = { committed: false, rolledBack: false };
    const database = {
        withTransaction: vi.fn(async (work) => {
            try {
                const result = await work(transaction);
                transactionState.committed = true;
                return result;
            } catch (error) {
                transactionState.rolledBack = true;
                throw error;
            }
        })
    };

    return {
        database,
        repository,
        transaction,
        transactionState,
        service: createCorrectionsService({ repository, database })
    };
};

describe('servico da tela de correcoes', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lista correcoes identificadas com busca normalizada no escopo da aplicacao', async () => {
        const { repository, service } = createHarness();

        await service.listCorrections(7, { applicationId: '9', search: '  Ana  ' });

        expect(repository.findOwnedApplication).toHaveBeenCalledWith(9, 7);
        expect(repository.listCorrections).toHaveBeenCalledWith(9, 7, 'Ana');
    });

    it('retorna versoes e alunos somente depois de validar a propriedade da aplicacao', async () => {
        const { repository, service } = createHarness();

        await expect(service.getFormOptions(7, '9')).resolves.toEqual({
            versions: [{ id: 12, versionNumber: 1 }],
            students: [student()]
        });
        expect(repository.findOwnedApplication).toHaveBeenCalledWith(9, 7);
        expect(repository.listVersions).toHaveBeenCalledWith(9, 7);
        expect(repository.listApplicationStudents).toHaveBeenCalledWith(9, 7);
    });

    it('entrega questoes na ordem impressa sem revelar o gabarito', async () => {
        const { repository, service } = createHarness();

        const result = await service.getVersionQuestions(7, '12');

        expect(repository.findOwnedVersion).toHaveBeenCalledWith(12, 7);
        expect(result).toMatchObject({ versionId: 12, applicationId: 9, versionNumber: 1 });
        expect(result.questions).toHaveLength(2);
        expect(result.questions[0]).toEqual({
            questionId: 101,
            order: 1,
            statement: 'Questao um',
            score: 1.25,
            alternatives: [
                { id: 1001, order: 1, text: 'A' },
                { id: 1002, order: 2, text: 'B' }
            ]
        });
        expect(JSON.stringify(result)).not.toContain('isCorrect');
    });

    it('calcula nota e respostas no servidor e grava tudo pela mesma transacao', async () => {
        const { repository, service, transaction, transactionState } = createHarness();

        const result = await service.createCorrection(7, creationPayload());

        expect(repository.findOwnedVersionForUpdate).toHaveBeenCalledWith(12, 7, transaction);
        expect(repository.findStudentForUpdate).toHaveBeenCalledWith(31, 4, transaction);
        expect(repository.listVersionAnswerKey).toHaveBeenCalledWith(12, 7, transaction);
        expect(repository.findCorrectionConflict).toHaveBeenCalledWith(12, 31, 55, transaction);
        expect(repository.insertCorrection).toHaveBeenCalledWith({
            examAssignmentId: 55,
            examVersionId: 12,
            studentId: 31,
            status: 'confirmed',
            totalScore: 1.25,
            notes: 'Revisar a segunda questao.',
            correctedBy: 7
        }, transaction);
        expect(repository.insertCorrectionAnswers).toHaveBeenCalledWith(88, [
            {
                questionId: 101,
                selectedAlternativeId: 1001,
                isCorrect: true,
                awardedScore: 1.25
            },
            {
                questionId: 102,
                selectedAlternativeId: null,
                isCorrect: false,
                awardedScore: 0
            }
        ], transaction);
        expect(repository.findCorrectionById).toHaveBeenCalledWith(88, 7, transaction);
        expect(result.id).toBe(88);
        expect(transactionState).toEqual({ committed: true, rolledBack: false });
    });

    it('rejeita campos de autoridade e pontuacao enviados pelo cliente antes da transacao', async () => {
        const { database, service } = createHarness();

        for (const field of ['teacherId', 'examAssignmentId', 'correctedBy', 'totalScore']) {
            await expect(service.createCorrection(7, creationPayload({ [field]: 999 })))
                .rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        }
        await expect(service.createCorrection(7, creationPayload({
            answers: [{
                questionId: 101,
                selectedAlternativeId: 1001,
                isCorrect: true
            }]
        }))).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        expect(database.withTransaction).not.toHaveBeenCalled();
    });

    it('rejeita respostas ausentes, repetidas ou com alternativa fora da versao sem gravar', async () => {
        const missing = createHarness();
        await expect(missing.service.createCorrection(7, creationPayload({
            answers: [{ questionId: 101, selectedAlternativeId: 1001 }]
        }))).rejects.toMatchObject({ status: 400, code: 'INVALID_ANSWERS' });
        expect(missing.repository.insertCorrection).not.toHaveBeenCalled();

        const duplicate = createHarness();
        await expect(duplicate.service.createCorrection(7, creationPayload({
            answers: [
                { questionId: 101, selectedAlternativeId: 1001 },
                { questionId: 101, selectedAlternativeId: 1001 }
            ]
        }))).rejects.toMatchObject({ status: 400, code: 'INVALID_ANSWERS' });
        expect(duplicate.repository.insertCorrection).not.toHaveBeenCalled();

        const foreignAlternative = createHarness();
        await expect(foreignAlternative.service.createCorrection(7, creationPayload({
            answers: [
                { questionId: 101, selectedAlternativeId: 1004 },
                { questionId: 102, selectedAlternativeId: null }
            ]
        }))).rejects.toMatchObject({ status: 400, code: 'INVALID_ANSWERS' });
        expect(foreignAlternative.repository.insertCorrection).not.toHaveBeenCalled();
    });

    it('oculta versao ou aluno fora do escopo e rejeita correcao duplicada', async () => {
        const foreignVersion = createHarness({
            findOwnedVersionForUpdate: vi.fn().mockResolvedValue(null)
        });
        await expect(foreignVersion.service.createCorrection(7, creationPayload()))
            .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });

        const foreignStudent = createHarness({
            findStudentForUpdate: vi.fn().mockResolvedValue(null)
        });
        await expect(foreignStudent.service.createCorrection(7, creationPayload()))
            .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });

        const duplicate = createHarness({
            findCorrectionConflict: vi.fn().mockResolvedValue({ id: 77 })
        });
        await expect(duplicate.service.createCorrection(7, creationPayload()))
            .rejects.toMatchObject({ status: 409, code: 'CORRECTION_CONFLICT' });
        expect(duplicate.repository.insertCorrection).not.toHaveBeenCalled();
    });

    it('faz rollback quando a insercao de respostas falha depois do cabecalho', async () => {
        const failure = new Error('answer insert failed');
        const { repository, service, transactionState } = createHarness({
            insertCorrectionAnswers: vi.fn().mockRejectedValue(failure)
        });

        await expect(service.createCorrection(7, creationPayload())).rejects.toBe(failure);
        expect(repository.insertCorrection).toHaveBeenCalledOnce();
        expect(transactionState).toEqual({ committed: false, rolledBack: true });
    });

    it('traduz corrida de unicidade para conflito e mantem a transacao sem commit', async () => {
        const duplicate = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
        const { service, transactionState } = createHarness({
            insertCorrection: vi.fn().mockRejectedValue(duplicate)
        });

        await expect(service.createCorrection(7, creationPayload())).rejects.toMatchObject({
            status: 409,
            code: 'CORRECTION_CONFLICT'
        });
        expect(transactionState).toEqual({ committed: false, rolledBack: true });
    });
});

describe('servico de correcoes sem aluno', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lista somente depois de confirmar que a aplicacao pertence ao professor', async () => {
        const { repository, service } = createHarness();

        const result = await service.listPending(7, '9');

        expect(result).toEqual([correction()]);
        expect(repository.findOwnedApplication).toHaveBeenCalledWith(9, 7);
        expect(repository.listPending).toHaveBeenCalledWith(9, 7);
    });

    it('nao revela uma aplicacao pertencente a outro professor', async () => {
        const { repository, service } = createHarness({
            findOwnedApplication: vi.fn().mockResolvedValue(null)
        });

        await expect(service.listStudents(7, 9)).rejects.toMatchObject({
            status: 404,
            code: 'NOT_FOUND'
        });
        expect(repository.listApplicationStudents).not.toHaveBeenCalled();
    });

    it('associa o aluno e a atribuicao da mesma versao sem apagar o historico reportado', async () => {
        const { repository, service, transaction, transactionState } = createHarness();

        const result = await service.associateStudent(7, '17', { studentId: 31 });

        expect(result).toMatchObject({
            id: 17,
            studentId: 31,
            examAssignmentId: 55,
            reportedStudentName: 'Ana informada na prova',
            reportedStudentRegistration: '20260042'
        });
        expect(repository.findCorrectionForUpdate).toHaveBeenCalledWith(17, 7, transaction);
        expect(repository.findStudentForUpdate).toHaveBeenCalledWith(31, 4, transaction);
        expect(repository.findAssignment).toHaveBeenCalledWith(12, 31, transaction);
        expect(repository.updateAssociation).toHaveBeenCalledWith(17, 31, 55, transaction);
        expect(transactionState).toEqual({ committed: true, rolledBack: false });
    });

    it('associa somente student_id quando a versao nao possui atribuicao para o aluno', async () => {
        const { repository, service } = createHarness({
            findAssignment: vi.fn().mockResolvedValue(null)
        });

        const result = await service.associateStudent(7, 17, { studentId: 31 });

        expect(result.examAssignmentId).toBeNull();
        expect(repository.updateAssociation).toHaveBeenCalledWith(17, 31, null, expect.anything());
    });

    it('faz rollback e nao atualiza quando a matricula selecionada diverge da reportada', async () => {
        const { repository, service, transactionState } = createHarness({
            findStudentForUpdate: vi.fn().mockResolvedValue(student({ registration: '20269999' }))
        });

        await expect(service.associateStudent(7, 17, { studentId: 31 })).rejects.toMatchObject({
            status: 409,
            code: 'REGISTRATION_MISMATCH'
        });
        expect(repository.findAssignment).not.toHaveBeenCalled();
        expect(repository.updateAssociation).not.toHaveBeenCalled();
        expect(transactionState).toEqual({ committed: false, rolledBack: true });
    });

    it('faz rollback quando o aluno nao esta ativo na turma da aplicacao', async () => {
        const { repository, service, transactionState } = createHarness({
            findStudentForUpdate: vi.fn().mockResolvedValue(null)
        });

        await expect(service.associateStudent(7, 17, { studentId: 31 })).rejects.toMatchObject({
            status: 404,
            code: 'NOT_FOUND'
        });
        expect(repository.updateAssociation).not.toHaveBeenCalled();
        expect(transactionState.rolledBack).toBe(true);
    });

    it('rejeita correcao alheia ou ja associada antes de qualquer atualizacao', async () => {
        const foreign = createHarness({
            findCorrectionForUpdate: vi.fn().mockResolvedValue(null)
        });
        await expect(foreign.service.associateStudent(7, 17, { studentId: 31 }))
            .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
        expect(foreign.repository.updateAssociation).not.toHaveBeenCalled();

        const associated = createHarness({
            findCorrectionForUpdate: vi.fn().mockResolvedValue(correction({ studentId: 31 }))
        });
        await expect(associated.service.associateStudent(7, 17, { studentId: 31 }))
            .rejects.toMatchObject({ status: 409, code: 'CORRECTION_ALREADY_ASSOCIATED' });
        expect(associated.repository.updateAssociation).not.toHaveBeenCalled();

        const assignmentOnly = createHarness({
            findCorrectionForUpdate: vi.fn().mockResolvedValue(correction({
                examAssignmentId: 55
            }))
        });
        await expect(assignmentOnly.service.associateStudent(7, 17, { studentId: 31 }))
            .rejects.toMatchObject({ status: 409, code: 'CORRECTION_ALREADY_ASSOCIATED' });
        expect(assignmentOnly.repository.updateAssociation).not.toHaveBeenCalled();
    });

    it('rejeita conflito da mesma versao e aluno sem alterar o banco', async () => {
        const { repository, service, transactionState } = createHarness({
            findAssociationConflict: vi.fn().mockResolvedValue({ id: 99 })
        });

        await expect(service.associateStudent(7, 17, { studentId: 31 })).rejects.toMatchObject({
            status: 409,
            code: 'CORRECTION_ASSOCIATION_CONFLICT'
        });
        expect(repository.updateAssociation).not.toHaveBeenCalled();
        expect(transactionState.rolledBack).toBe(true);
    });

    it('faz rollback quando a atualizacao condicional perde uma corrida', async () => {
        const { repository, service, transactionState } = createHarness({
            updateAssociation: vi.fn().mockResolvedValue(0)
        });

        await expect(service.associateStudent(7, 17, { studentId: 31 })).rejects.toMatchObject({
            status: 409,
            code: 'CORRECTION_ALREADY_ASSOCIATED'
        });
        expect(repository.updateAssociation).toHaveBeenCalledOnce();
        expect(transactionState).toEqual({ committed: false, rolledBack: true });
    });

    it('traduz conflito de unicidade do MySQL e mantem a transacao sem commit', async () => {
        const duplicate = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
        const { service, transactionState } = createHarness({
            updateAssociation: vi.fn().mockRejectedValue(duplicate)
        });

        await expect(service.associateStudent(7, 17, { studentId: 31 })).rejects.toMatchObject({
            status: 409,
            code: 'CORRECTION_ASSOCIATION_CONFLICT'
        });
        expect(transactionState).toEqual({ committed: false, rolledBack: true });
    });

    it('rejeita identificadores e campos extras, inclusive teacherId, antes da transacao', async () => {
        const { database, service } = createHarness();

        await expect(service.associateStudent(7, 'abc', { studentId: 31 }))
            .rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        await expect(service.associateStudent(7, 17, { studentId: 31, teacherId: 99 }))
            .rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        await expect(service.associateStudent(7, 17, { studentId: 0 }))
            .rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        await expect(service.associateStudent(7, 17, { studentId: '31' }))
            .rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        await expect(service.associateStudent(7, 17, { studentId: [31] }))
            .rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        await expect(service.associateStudent(7, 17, {
            studentId: { toString: null }
        })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        expect(database.withTransaction).not.toHaveBeenCalled();
    });
});
