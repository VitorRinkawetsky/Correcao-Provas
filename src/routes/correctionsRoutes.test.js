import express from 'express';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import correctionsRoutes from './correctionsRoutes';

const nodeRequire = createRequire(import.meta.url);
const { ApiError } = nodeRequire('../http/ApiError.js');

const { createCorrectionsRouter } = correctionsRoutes;

const service = {
    getContext: vi.fn(),
    correct: vi.fn(),
    getCorrection: vi.fn(),
    update: vi.fn(),
    listCorrections: vi.fn(),
    getFormOptions: vi.fn(),
    getVersionQuestions: vi.fn(),
    createCorrection: vi.fn(),
    listPending: vi.fn(),
    listStudents: vi.fn(),
    associateStudent: vi.fn()
};

let server;
let baseUrl;

const call = async (method, path, body, teacherId = 7) => {
    const response = await fetch(`${baseUrl}/api/corrections${path}`, {
        method,
        headers: {
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(teacherId == null ? {} : { 'x-test-teacher': String(teacherId) })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: response.status === 204 ? null : await response.json()
    };
};

beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((request, _response, next) => {
        request.authenticatedTeacherId = Number(request.get('x-test-teacher'));
        next();
    });
    app.use('/api/corrections', createCorrectionsRouter({ service }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
    vi.clearAllMocks();
    service.getContext.mockResolvedValue({ examVersionId: 12 });
    service.correct.mockResolvedValue({ id: 91, totalScore: 7.5 });
    service.getCorrection.mockResolvedValue({ id: 91, totalScore: 7.5 });
    service.update.mockResolvedValue({ id: 91, totalScore: 8 });
    service.listCorrections.mockResolvedValue([{ id: 88 }]);
    service.getFormOptions.mockResolvedValue({ versions: [], students: [] });
    service.getVersionQuestions.mockResolvedValue({ versionId: 12, questions: [] });
    service.createCorrection.mockResolvedValue({ id: 88, totalScore: 1.25 });
    service.listPending.mockResolvedValue([{ id: 17 }]);
    service.listStudents.mockResolvedValue([{ id: 31 }]);
    service.associateStudent.mockResolvedValue({ id: 17, studentId: 31 });
});

describe('rotas de correcoes sem aluno', () => {
    it('lista, carrega formulario e cria correcao com o professor da sessao', async () => {
        const listed = await call('GET', '/?applicationId=9&search=Ana');
        const options = await call('GET', '/applications/9/form-options');
        const questions = await call('GET', '/versions/12/questions');
        const payload = {
            examVersionId: 12,
            studentId: 31,
            status: 'confirmed',
            notes: null,
            answers: [{ questionId: 101, selectedAlternativeId: 1001 }]
        };
        const created = await call('POST', '/manual', payload);

        expect(listed).toEqual({
            status: 200,
            body: { data: [{ id: 88 }], meta: { total: 1 } }
        });
        expect(options.status).toBe(200);
        expect(questions.status).toBe(200);
        expect(created).toEqual({
            status: 201,
            body: { data: { id: 88, totalScore: 1.25 }, meta: {} }
        });
        expect(service.listCorrections).toHaveBeenCalledWith(7, {
            applicationId: '9',
            search: 'Ana'
        });
        expect(service.getFormOptions).toHaveBeenCalledWith(7, '9');
        expect(service.getVersionQuestions).toHaveBeenCalledWith(7, '12');
        expect(service.createCorrection).toHaveBeenCalledWith(7, payload);
    });

    it('preserva contexto, criacao, detalhe e edicao por QR Code', async () => {
        const qrPayload = {
            qrCodePayload: 'QR-ABC',
            studentName: 'Ana',
            studentRegistration: '20260042',
            answers: []
        };
        const updatePayload = {
            studentName: 'Ana',
            studentRegistration: '20260042',
            notes: 'Revisada',
            answers: []
        };

        const context = await call('GET', '/context?code=QR-ABC');
        const created = await call('POST', '/', qrPayload);
        const details = await call('GET', '/91');
        const updated = await call('PUT', '/91', updatePayload);

        expect(context.status).toBe(200);
        expect(created.status).toBe(201);
        expect(details.status).toBe(200);
        expect(updated.status).toBe(200);
        expect(service.getContext).toHaveBeenCalledWith('QR-ABC', 7);
        expect(service.correct).toHaveBeenCalledWith(7, qrPayload);
        expect(service.getCorrection).toHaveBeenCalledWith('91', 7);
        expect(service.update).toHaveBeenCalledWith(
            '91',
            7,
            updatePayload
        );
    });

    it('lista pendencias e alunos no escopo do professor autenticado', async () => {
        const pending = await call('GET', '/applications/9/pending');
        const students = await call('GET', '/applications/9/students');

        expect(pending).toEqual({
            status: 200,
            body: { data: [{ id: 17 }], meta: { total: 1 } }
        });
        expect(students).toEqual({
            status: 200,
            body: { data: [{ id: 31 }], meta: { total: 1 } }
        });
        expect(service.listPending).toHaveBeenCalledWith(7, '9');
        expect(service.listStudents).toHaveBeenCalledWith(7, '9');
    });

    it('associa usando o professor da sessao e nao um identificador de cliente', async () => {
        const response = await call('PUT', '/17/student', { studentId: 31 });

        expect(response).toEqual({
            status: 200,
            body: { data: { id: 17, studentId: 31 }, meta: {} }
        });
        expect(service.associateStudent).toHaveBeenCalledWith(7, '17', { studentId: 31 });
    });

    it('serializa validacao invalida sem chamar uma operacao posterior', async () => {
        service.associateStudent.mockRejectedValue(new ApiError(
            400,
            'VALIDATION_ERROR',
            'Dados invalidos.',
            [{ field: 'studentId' }]
        ));

        const response = await call('PUT', '/17/student', { studentId: 0 });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatchObject({
            code: 'VALIDATION_ERROR',
            details: [{ field: 'studentId' }]
        });
    });

    it('ignora teacherId do corpo como identidade e exige sessao autenticada', async () => {
        const response = await call('PUT', '/17/student', {
            studentId: 31,
            teacherId: 99
        }, null);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('UNAUTHENTICATED');
        expect(service.associateStudent).not.toHaveBeenCalled();
    });
});
