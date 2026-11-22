import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import database from '../config/database';
import correctionsRepository from '../repositories/correctionsRepository';

const { pool, closeDatabaseConnection } = database;
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);
const RUN = `status_flow_${Date.now()}`;
const email = `${RUN}@example.com`;
const password = 'Senha#2026Status';

let server;
let baseUrl;
let cookie;
let teacherId;
let studentIdA;
let studentIdB;
let classId;
let examId;
let questionId;
let applicationId;
let versionId;
let correctionIdA;
let correctAlternativeId;

const call = async (method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(cookie ? { Cookie: cookie } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: response.status === 204 ? null : await response.json().catch(() => null),
        setCookie: response.headers.get('set-cookie')
    };
};

const statusOf = async (table, id) => {
    const [rows] = await pool.query(`SELECT status FROM ${table} WHERE id = ?`, [id]);
    return rows[0]?.status;
};

describe.skipIf(!databaseAvailable)('status da aplicacao e da prova apos correcoes por QR (MySQL)', () => {
    beforeAll(async () => {
        server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;

        const registered = await call('POST', '/api/auth/register', {
            fullName: 'Professor Status Flow',
            email,
            password
        });
        expect(registered.status).toBe(201);
        teacherId = registered.body.data.id;

        const login = await call('POST', '/api/auth/login', { email, password });
        expect(login.status).toBe(200);
        cookie = login.setCookie?.split(';')[0];

        const [studentA] = await pool.query(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            ['Aluno A Status', `${RUN}-A`, `${RUN}-a@example.com`]
        );
        studentIdA = studentA.insertId;
        const [studentB] = await pool.query(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            ['Aluno B Status', `${RUN}-B`, `${RUN}-b@example.com`]
        );
        studentIdB = studentB.insertId;

        const [classItem] = await pool.query(
            `INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code)
             VALUES (?, ?, ?, ?, ?)`,
            [teacherId, 'Turma Status Flow', 'Testes', '2026/2', `ST${Date.now()}`]
        );
        classId = classItem.insertId;
        await pool.query(
            'INSERT INTO class_students (class_id, student_id) VALUES (?, ?), (?, ?)',
            [classId, studentIdA, classId, studentIdB]
        );

        const [exam] = await pool.query(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
            [teacherId, 'Prova Status Flow']
        );
        examId = exam.insertId;
        const [question] = await pool.query(
            'INSERT INTO questions (teacher_id, statement) VALUES (?, ?)',
            [teacherId, 'Questao do fluxo de status']
        );
        questionId = question.insertId;
        await pool.query(
            `INSERT INTO alternatives (question_id, position, alternative_text, is_correct)
             VALUES (?, 1, 'Correta', TRUE), (?, 2, 'Incorreta', FALSE)`,
            [questionId, questionId]
        );
        const [alternatives] = await pool.query(
            'SELECT id FROM alternatives WHERE question_id = ? ORDER BY position',
            [questionId]
        );
        correctAlternativeId = alternatives[0].id;
        await pool.query(
            `INSERT INTO exam_questions (exam_id, question_id, question_order, score)
             VALUES (?, ?, 1, 10)`,
            [examId, questionId]
        );

        const [application] = await pool.query(
            'INSERT INTO applications (exam_id, class_id, teacher_id) VALUES (?, ?, ?)',
            [examId, classId, teacherId]
        );
        applicationId = application.insertId;

        // Versao sem identificacao: exam_assignments fica vazio, so a matricula identifica o aluno.
        const [version] = await pool.query(
            `INSERT INTO exam_versions (application_id, version_number, public_code, qr_code_payload)
             VALUES (?, 1, ?, ?)`,
            [applicationId, `${RUN}-public`, `${RUN}-qr`]
        );
        versionId = version.insertId;
        await pool.query(
            `INSERT INTO exam_version_questions (exam_version_id, question_id, printed_order)
             VALUES (?, ?, 1)`,
            [versionId, questionId]
        );
        await pool.query(
            `INSERT INTO exam_version_alternatives (exam_version_id, question_id, alternative_id, printed_order)
             VALUES (?, ?, ?, 1)`,
            [versionId, questionId, correctAlternativeId]
        );
    });

    afterAll(async () => {
        try {
            await pool.query(
                'DELETE ca FROM correction_answers ca INNER JOIN corrections c ON c.id = ca.correction_id ' +
                'WHERE c.exam_version_id = ?',
                [versionId]
            );
            await pool.query('DELETE FROM corrections WHERE exam_version_id = ?', [versionId]);
            if (versionId) await pool.query('DELETE FROM exam_versions WHERE id = ?', [versionId]);
            if (applicationId) await pool.query('DELETE FROM applications WHERE id = ?', [applicationId]);
            if (examId) {
                await pool.query('DELETE FROM exam_questions WHERE exam_id = ?', [examId]);
                await pool.query('DELETE FROM exams WHERE id = ?', [examId]);
            }
            if (questionId) {
                await pool.query('DELETE FROM alternatives WHERE question_id = ?', [questionId]);
                await pool.query('DELETE FROM questions WHERE id = ?', [questionId]);
            }
            if (classId) {
                await pool.query('DELETE FROM class_students WHERE class_id = ?', [classId]);
                await pool.query('DELETE FROM classes WHERE id = ?', [classId]);
            }
            if (studentIdA) await pool.query('DELETE FROM students WHERE id = ?', [studentIdA]);
            if (studentIdB) await pool.query('DELETE FROM students WHERE id = ?', [studentIdB]);
            if (teacherId) await pool.query('DELETE FROM professors WHERE id = ?', [teacherId]);
        } finally {
            try {
                if (server) await new Promise((resolve) => server.close(resolve));
            } finally {
                await closeDatabaseConnection();
            }
        }
    });

    it('aceita o public_code digitado manualmente e fica "em correcao" apos a primeira correcao', async () => {
        const result = await call('POST', '/api/corrections', {
            qrCodePayload: `${RUN}-public`,
            studentRegistration: `${RUN}-A`,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        });

        expect(result.status).toBe(201);
        expect(result.body.data.totalScore).toBe(10);
        correctionIdA = result.body.data.id;

        expect(await statusOf('applications', applicationId)).toBe('in_correction');
        expect(await statusOf('exams', examId)).not.toBe('closed');
    });

    it('rejeita com 409 ao corrigir a mesma prova duas vezes para a mesma matricula', async () => {
        const result = await call('POST', '/api/corrections', {
            qrCodePayload: `${RUN}-qr`,
            studentRegistration: `${RUN}-A`,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        });

        expect(result.status).toBe(409);
        expect(result.body.error.code).toBe('CORRECTION_CONFLICT');
    });

    it('fica "closed" quando o ultimo aluno ativo e corrigido, e fecha a prova junto', async () => {
        const result = await call('POST', '/api/corrections', {
            qrCodePayload: `${RUN}-qr`,
            studentRegistration: `${RUN}-B`,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        });

        expect(result.status).toBe(201);
        expect(await statusOf('applications', applicationId)).toBe('closed');
        expect(await statusOf('exams', examId)).toBe('closed');
    });

    it('volta para "em correcao" se uma correcao confirmada for apagada (recalculo a partir do estado atual)', async () => {
        await pool.query('DELETE FROM correction_answers WHERE correction_id = ?', [correctionIdA]);
        await pool.query('DELETE FROM corrections WHERE id = ?', [correctionIdA]);

        await correctionsRepository.refreshApplicationStatus(applicationId, pool);

        expect(await statusOf('applications', applicationId)).toBe('in_correction');
    });
});
