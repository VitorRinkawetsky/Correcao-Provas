import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import database from '../config/database';
import questionsRoutes from './questionsRoutes';

const { pool, closeDatabaseConnection } = database;

// Estes testes exercitam rotas, service e repository contra o MySQL com o schema
// de database/init.sql. Sem banco disponível (ex.: CI), a suíte é ignorada.
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);

const RUN = `__test_${Date.now()}`;
const professorIds = [];
const examIds = [];
let teacherA;
let teacherB;
let server;
let baseUrl;

// O professor autenticado é injetado no contexto do servidor (como faria o
// middleware de autenticação). O cabeçalho abaixo só existe neste app de teste.
const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use((request, _response, next) => {
        request.authenticatedTeacherId = Number(request.get('x-test-teacher'));
        next();
    });
    app.use('/api/questions', questionsRoutes);
    return app;
};

const call = async (teacherId, method, path, body) => {
    const response = await fetch(`${baseUrl}/api/questions${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-test-teacher': String(teacherId) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return { status: response.status, body: await response.json().catch(() => null) };
};

const payload = (overrides = {}) => ({
    statement: `${RUN} O que é normalização?`,
    tags: [`${RUN}-bd`],
    alternatives: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
    correctAlternativeIndex: 1,
    ...overrides
});

const createQuestion = async (teacherId, overrides) => {
    const response = await call(teacherId, 'POST', '', payload(overrides));
    expect(response.status).toBe(201);
    return response.body;
};

const createProfessor = async (label) => {
    const [result] = await pool.query(
        'INSERT INTO professors (full_name, email) VALUES (?, ?)',
        [`${RUN} ${label}`, `${RUN}-${label}@teste.local`]
    );
    professorIds.push(result.insertId);
    return result.insertId;
};

const useInExam = async (teacherId, questionId) => {
    const [exam] = await pool.query(
        'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
        [teacherId, `${RUN} prova`]
    );
    examIds.push(exam.insertId);
    await pool.query(
        'INSERT INTO exam_questions (exam_id, question_id, question_order, score) VALUES (?, ?, 1, 1)',
        [exam.insertId, questionId]
    );
    return exam.insertId;
};

describe.skipIf(!databaseAvailable)('API /api/questions (MySQL)', () => {
    beforeAll(async () => {
        teacherA = await createProfessor('a');
        teacherB = await createProfessor('b');
        server = buildApp().listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        if (professorIds.length) {
            const ids = [professorIds];
            const [questions] = await pool.query('SELECT id FROM questions WHERE teacher_id IN (?)', ids);
            const questionIds = questions.map((question) => question.id);

            if (examIds.length) await pool.query('DELETE FROM exams WHERE id IN (?)', [examIds]);
            if (questionIds.length) {
                await pool.query('DELETE FROM questions WHERE id IN (?)', [questionIds]);
            }
            await pool.query('DELETE FROM professors WHERE id IN (?)', ids);
        }
        await pool.query('DELETE FROM tags WHERE name LIKE ?', [`${RUN}%`]);
        await new Promise((resolve) => server?.close(resolve));
        await closeDatabaseConnection();
    });

    describe('criação', () => {
        it('cria questão e devolve alternativas, tags e a alternativa correta', async () => {
            const created = await createQuestion(teacherA);

            expect(created.teacherId).toBe(teacherA);
            expect(created.alternatives.map((item) => item.position)).toEqual([1, 2, 3]);
            expect(created.correctAlternativeIndex).toBe(1);
            expect(created.correctAlternativeId).toBe(created.alternatives[1].id);
            expect(created.tags).toEqual([`${RUN}-bd`]);
        });

        it('ignora teacherId enviado no corpo e usa o professor autenticado', async () => {
            const created = await createQuestion(teacherA, { teacherId: teacherB });

            expect(created.teacherId).toBe(teacherA);
            expect((await call(teacherB, 'GET', `/${created.id}`)).status).toBe(404);
        });

        it('rejeita payload inválido com 400 sem gravar nada', async () => {
            const statement = `${RUN} inválida`;
            const invalid = [
                { alternatives: [{ text: 'A' }] },
                { alternatives: ['a', 'b', 'c', 'd', 'e', 'f'].map((text) => ({ text })) },
                { alternatives: [{ text: 'A' }, { text: '  ' }] },
                { statement: '   ' },
                { correctAlternativeIndex: undefined },
                { correctAlternativeIndex: 3 }
            ];

            for (const overrides of invalid) {
                const response = await call(teacherA, 'POST', '', payload({ statement, ...overrides }));
                expect(response.status, JSON.stringify(overrides)).toBe(400);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            }

            const [rows] = await pool.query('SELECT id FROM questions WHERE statement = ?', [statement]);
            expect(rows).toHaveLength(0);
        });
    });

    describe('listagem', () => {
        it('lista só questões do professor, no contrato do questionStore', async () => {
            const created = await createQuestion(teacherA);

            const listA = await call(teacherA, 'GET', '');
            expect(listA.status).toBe(200);
            expect(Array.isArray(listA.body)).toBe(true);

            const found = listA.body.find((question) => question.id === created.id);
            expect(found).toMatchObject({
                statement: created.statement,
                status: 'active',
                correctAlternativeId: created.correctAlternativeId,
                tags: [`${RUN}-bd`]
            });
            expect(found.alternatives[1]).toMatchObject({ text: 'B', isCorrect: true });

            const listB = await call(teacherB, 'GET', '');
            expect(listB.body.some((question) => question.id === created.id)).toBe(false);
        });

        it('filtra por texto e por tag', async () => {
            const created = await createQuestion(teacherA, {
                statement: `${RUN} filtro único`,
                tags: [`${RUN}-filtro`]
            });
            await createQuestion(teacherA, { statement: `${RUN} outra` });

            const byText = await call(teacherA, 'GET', `?search=${encodeURIComponent('filtro único')}`);
            expect(byText.body.map((question) => question.id)).toEqual([created.id]);

            const byTag = await call(teacherA, 'GET', `?tags=${encodeURIComponent(`${RUN}-filtro`)}`);
            expect(byTag.body.map((question) => question.id)).toEqual([created.id]);
        });
    });

    describe('edição', () => {
        it('edita e devolve a alternativa correta atualizada', async () => {
            const created = await createQuestion(teacherA);

            const response = await call(teacherA, 'PUT', `/${created.id}`, payload({
                statement: `${RUN} editada`,
                tags: [`${RUN}-novo`],
                alternatives: [{ text: 'X' }, { text: 'Y' }],
                correctAlternativeIndex: 0
            }));

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                id: created.id, newVersion: false, statement: `${RUN} editada`, correctAlternativeIndex: 0
            });
            expect(response.body.alternatives.map((item) => item.text)).toEqual(['X', 'Y']);
            expect(response.body.correctAlternativeId).toBe(response.body.alternatives[0].id);
            expect(response.body.tags).toEqual([`${RUN}-novo`]);
        });

        it('troca a alternativa correta sem violar a unicidade do schema', async () => {
            const created = await createQuestion(teacherA, { correctAlternativeIndex: 0 });

            const response = await call(teacherA, 'PUT', `/${created.id}`, payload({
                correctAlternativeIndex: 2
            }));

            expect(response.status).toBe(200);
            expect(response.body.alternatives.filter((item) => item.isCorrect)).toHaveLength(1);
            expect(response.body.correctAlternativeIndex).toBe(2);
        });

        it('rejeita edição inválida e mantém a questão intacta', async () => {
            const created = await createQuestion(teacherA);

            const response = await call(teacherA, 'PUT', `/${created.id}`, payload({
                alternatives: [{ text: 'só uma' }]
            }));

            expect(response.status).toBe(400);
            expect((await call(teacherA, 'GET', `/${created.id}`)).body.alternatives).toHaveLength(3);
        });

        it('preserva a questão usada em prova e cria uma nova versão', async () => {
            const created = await createQuestion(teacherA);
            const examId = await useInExam(teacherA, created.id);

            const response = await call(teacherA, 'PUT', `/${created.id}`, payload({
                statement: `${RUN} nova versão`
            }));

            expect(response.status).toBe(200);
            expect(response.body.newVersion).toBe(true);
            expect(response.body.id).not.toBe(created.id);
            expect(response.body.statement).toBe(`${RUN} nova versão`);

            const [[old]] = await pool.query(
                'SELECT statement, status FROM questions WHERE id = ?', [created.id]
            );
            expect(old).toEqual({ statement: created.statement, status: 'archived' });

            const [alternatives] = await pool.query(
                'SELECT id FROM alternatives WHERE question_id = ?', [created.id]
            );
            expect(alternatives).toHaveLength(3);

            const [links] = await pool.query(
                'SELECT question_id FROM exam_questions WHERE exam_id = ?', [examId]
            );
            expect(links).toEqual([{ question_id: created.id }]);
        });
    });

    describe('exclusão', () => {
        it('exclui questão que nunca foi usada', async () => {
            const created = await createQuestion(teacherA);

            const response = await call(teacherA, 'DELETE', `/${created.id}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'deleted', id: created.id, archived: false });

            const [rows] = await pool.query('SELECT id FROM questions WHERE id = ?', [created.id]);
            const [alternatives] = await pool.query(
                'SELECT id FROM alternatives WHERE question_id = ?', [created.id]
            );
            expect(rows).toHaveLength(0);
            expect(alternatives).toHaveLength(0);
        });

        it('arquiva, sem apagar, questão já usada em prova', async () => {
            const created = await createQuestion(teacherA);
            const examId = await useInExam(teacherA, created.id);

            const response = await call(teacherA, 'DELETE', `/${created.id}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'archived', id: created.id, archived: true });

            const [[row]] = await pool.query('SELECT status FROM questions WHERE id = ?', [created.id]);
            const [links] = await pool.query(
                'SELECT 1 FROM exam_questions WHERE exam_id = ? AND question_id = ?',
                [examId, created.id]
            );
            const [alternatives] = await pool.query(
                'SELECT id FROM alternatives WHERE question_id = ?', [created.id]
            );
            expect(row.status).toBe('archived');
            expect(links).toHaveLength(1);
            expect(alternatives).toHaveLength(3);

            const list = await call(teacherA, 'GET', '');
            expect(list.body.some((question) => question.id === created.id)).toBe(false);
            expect((await call(teacherA, 'DELETE', `/${created.id}`)).status).toBe(404);
        });
    });

    describe('isolamento entre professores', () => {
        it('professor B não lê, edita nem exclui questão do professor A', async () => {
            const created = await createQuestion(teacherA);

            expect((await call(teacherB, 'GET', `/${created.id}`)).status).toBe(404);
            expect((await call(teacherB, 'PUT', `/${created.id}`, payload())).status).toBe(404);
            expect((await call(teacherB, 'DELETE', `/${created.id}`)).status).toBe(404);

            const still = await call(teacherA, 'GET', `/${created.id}`);
            expect(still.status).toBe(200);
            expect(still.body.statement).toBe(created.statement);
        });
    });

    it('responde 400 para identificador inválido', async () => {
        expect((await call(teacherA, 'GET', '/abc')).status).toBe(400);
        expect((await call(teacherA, 'DELETE', '/0')).status).toBe(400);
    });
});