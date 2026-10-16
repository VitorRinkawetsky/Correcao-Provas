const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const { pool, closeDatabaseConnection } = require('../src/config/database');

// Os dois professores precisam existir no banco (seed / FK).
const TEACHER_A = Number(process.env.TEST_TEACHER_A || 1);
const TEACHER_B = Number(process.env.TEST_TEACHER_B || 2);
// Prova existente, usada só nos testes de "questão já usada em prova".
const EXAM_ID = process.env.TEST_EXAM_ID;

const PREFIX = `__test_${Date.now()}`;
const createdIds = new Set();
const examLinks = [];
let server;
let baseUrl;

async function api(teacherId, method, path, body) {
    const response = await fetch(`${baseUrl}/api/questions${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Dev-Teacher-Id': String(teacherId)
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const json = await response.json().catch(() => null);
    return { status: response.status, body: json };
}

const payload = (overrides = {}) => ({
    statement: `${PREFIX} O que é normalização?`,
    tags: [`${PREFIX}-bd`],
    alternatives: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
    correctAlternativeIndex: 1,
    ...overrides
});

async function createQuestion(teacherId = TEACHER_A, overrides = {}) {
    const res = await api(teacherId, 'POST', '', payload(overrides));
    assert.equal(res.status, 201);
    createdIds.add(res.body.id);
    return res.body;
}

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    const ids = [...createdIds];
    if (ids.length) {
        await pool.query('DELETE FROM exam_questions WHERE question_id IN (?)', [ids]);
        await pool.query('DELETE FROM question_tags WHERE question_id IN (?)', [ids]);
        await pool.query('DELETE FROM alternatives WHERE question_id IN (?)', [ids]);
        await pool.query('DELETE FROM questions WHERE id IN (?)', [ids]);
    }
    await pool.query('DELETE FROM tags WHERE name LIKE ?', [`${PREFIX}%`]);
    await new Promise((resolve) => server.close(resolve));
    await closeDatabaseConnection();
});

// ---------- criação ----------

test('cria questão com alternativas, tags e alternativa correta', async () => {
    const created = await createQuestion();

    const res = await api(TEACHER_A, 'GET', `/${created.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.alternatives.length, 3);
    assert.equal(res.body.correctAlternativeIndex, 1);
    assert.equal(res.body.alternatives[1].isCorrect, true);
    assert.deepEqual(res.body.tags, [`${PREFIX}-bd`]);
});

test('ignora teacherId enviado no corpo da requisição', async () => {
    const created = await createQuestion(TEACHER_A, { teacherId: TEACHER_B });

    assert.equal(created.teacherId, TEACHER_A);
    assert.equal((await api(TEACHER_B, 'GET', `/${created.id}`)).status, 404);
});

// ---------- validação ----------

test('rejeita payloads inválidos com 400', async () => {
    const invalid = [
        { alternatives: [{ text: 'A' }] },
        { alternatives: ['a', 'b', 'c', 'd', 'e', 'f'].map((text) => ({ text })) },
        { statement: '   ' },
        { alternatives: [{ text: 'A' }, { text: '  ' }] },
        { correctAlternativeIndex: undefined },
        { correctAlternativeIndex: 5 },
        {
            correctAlternativeIndex: undefined,
            alternatives: [
                { text: 'A', isCorrect: true },
                { text: 'B', isCorrect: true }
            ]
        }
    ];

    for (const overrides of invalid) {
        const res = await api(TEACHER_A, 'POST', '', payload(overrides));
        assert.equal(res.status, 400, JSON.stringify(overrides));
    }
});

// ---------- edição ----------

test('edita questão e devolve a alternativa correta atualizada', async () => {
    const created = await createQuestion();

    const res = await api(
        TEACHER_A,
        'PUT',
        `/${created.id}`,
        payload({
            statement: `${PREFIX} editada`,
            alternatives: [{ text: 'X' }, { text: 'Y' }],
            correctAlternativeIndex: 0
        })
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.id, created.id);
    assert.equal(res.body.newVersion, false);

    const loaded = await api(TEACHER_A, 'GET', `/${created.id}`);
    assert.equal(loaded.body.statement, `${PREFIX} editada`);
    assert.equal(loaded.body.alternatives.length, 2);
    assert.equal(loaded.body.correctAlternativeIndex, 0);
});

// ---------- exclusão ----------

test('exclui questão que nunca foi usada em prova', async () => {
    const created = await createQuestion();

    const res = await api(TEACHER_A, 'DELETE', `/${created.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.archived, false);
    assert.equal((await api(TEACHER_A, 'GET', `/${created.id}`)).status, 404);
});

async function useInExam(questionId) {
    await pool.query(
        'INSERT INTO exam_questions (exam_id, question_id) VALUES (?, ?)',
        [EXAM_ID, questionId]
    );
    examLinks.push(questionId);
}

test(
    'arquiva (não apaga) questão já usada em prova',
    { skip: !EXAM_ID && 'defina TEST_EXAM_ID' },
    async () => {
        const created = await createQuestion();
        await useInExam(created.id);

        const res = await api(TEACHER_A, 'DELETE', `/${created.id}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.archived, true);

        const [[row]] = await pool.query(
            'SELECT status FROM questions WHERE id = ?',
            [created.id]
        );
        assert.equal(row.status, 'archived');

        const [links] = await pool.query(
            'SELECT 1 FROM exam_questions WHERE question_id = ?',
            [created.id]
        );
        assert.equal(links.length, 1);

        const listed = await api(TEACHER_A, 'GET', '');
        assert.ok(!listed.body.some((q) => q.id === created.id));
    }
);

test(
    'editar questão usada em prova cria nova versão e preserva a antiga',
    { skip: !EXAM_ID && 'defina TEST_EXAM_ID' },
    async () => {
        const created = await createQuestion();
        await useInExam(created.id);

        const res = await api(
            TEACHER_A,
            'PUT',
            `/${created.id}`,
            payload({ statement: `${PREFIX} nova versão` })
        );

        assert.equal(res.status, 200);
        assert.equal(res.body.newVersion, true);
        assert.notEqual(res.body.id, created.id);
        createdIds.add(res.body.id);

        const [[old]] = await pool.query(
            'SELECT statement, status FROM questions WHERE id = ?',
            [created.id]
        );
        assert.equal(old.status, 'archived');
        assert.equal(old.statement, created.statement);
    }
);

// ---------- isolamento entre professores ----------

test('professor B não lê, edita, exclui nem lista questão do professor A', async () => {
    const created = await createQuestion(TEACHER_A);

    assert.equal((await api(TEACHER_B, 'GET', `/${created.id}`)).status, 404);
    assert.equal(
        (await api(TEACHER_B, 'PUT', `/${created.id}`, payload())).status,
        404
    );
    assert.equal((await api(TEACHER_B, 'DELETE', `/${created.id}`)).status, 404);

    const listB = await api(TEACHER_B, 'GET', '');
    assert.ok(!listB.body.some((q) => q.id === created.id));

    // continua intacta para o dono
    const still = await api(TEACHER_A, 'GET', `/${created.id}`);
    assert.equal(still.status, 200);
    assert.equal(still.body.statement, created.statement);
});