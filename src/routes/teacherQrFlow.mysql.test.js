import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import database from '../config/database';

const { pool, closeDatabaseConnection } = database;
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);
const RUN = `teacher_qr_${Date.now()}`;
const email = `${RUN}@example.com`;
const password = 'Senha#2026Fluxo';

let server;
let baseUrl;
let cookie;
let teacherId;
let studentId;
let classId;
let examId;
let questionId;
let applicationId;
let versionId;
let assignmentId;
let correctionId;

const call = async (method, path, body, sessionCookie = cookie) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(sessionCookie ? { Cookie: sessionCookie } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: response.status === 204 ? null : await response.json().catch(() => null),
        setCookie: response.headers.get('set-cookie')
    };
};

describe.skipIf(!databaseAvailable)('fluxo autenticado de correcao por QR (MySQL)', () => {
    beforeAll(async () => {
        server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        try {
            if (correctionId) {
                await pool.query('DELETE FROM corrections WHERE id = ?', [correctionId]);
            }
            if (assignmentId) {
                await pool.query('DELETE FROM exam_assignments WHERE id = ?', [assignmentId]);
            }
            if (versionId) await pool.query('DELETE FROM exam_versions WHERE id = ?', [versionId]);
            if (applicationId) {
                await pool.query('DELETE FROM applications WHERE id = ?', [applicationId]);
            }
            if (examId) await pool.query('DELETE FROM exams WHERE id = ?', [examId]);
            if (questionId) await pool.query('DELETE FROM questions WHERE id = ?', [questionId]);
            if (classId) {
                await pool.query('DELETE FROM class_students WHERE class_id = ?', [classId]);
                await pool.query('DELETE FROM classes WHERE id = ?', [classId]);
            }
            if (studentId) await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
            if (teacherId) await pool.query('DELETE FROM professors WHERE id = ?', [teacherId]);
        } finally {
            try {
                if (server) await new Promise((resolve) => server.close(resolve));
            } finally {
                await closeDatabaseConnection();
            }
        }
    });

    it('cadastra, autentica, abre a aplicacao, corrige pelo QR e encerra a sessao', async () => {
        const registered = await call('POST', '/api/auth/register', {
            fullName: 'Professor Fluxo QR',
            email,
            password
        }, null);
        expect(registered.status).toBe(201);
        teacherId = registered.body.data.id;

        const login = await call('POST', '/api/auth/login', { email, password }, null);
        expect(login.status).toBe(200);
        cookie = login.setCookie?.split(';')[0];
        expect(cookie).toMatch(/^sgp_session=/);

        const me = await call('GET', '/api/auth/me');
        expect(me.status).toBe(200);
        expect(me.body.data.id).toBe(teacherId);

        const [student] = await pool.query(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            ['Aluno Fluxo QR', `${RUN}-001`, `${RUN}-student@example.com`]
        );
        studentId = student.insertId;
        const [classItem] = await pool.query(
            `INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code)
             VALUES (?, ?, ?, ?, ?)`,
            [teacherId, 'Turma Fluxo QR', 'Testes', '2026/2', `QR${Date.now()}`]
        );
        classId = classItem.insertId;
        await pool.query(
            'INSERT INTO class_students (class_id, student_id) VALUES (?, ?)',
            [classId, studentId]
        );
        const [exam] = await pool.query(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
            [teacherId, 'Prova Fluxo QR']
        );
        examId = exam.insertId;
        const [question] = await pool.query(
            'INSERT INTO questions (teacher_id, statement) VALUES (?, ?)',
            [teacherId, 'Questao do fluxo QR']
        );
        questionId = question.insertId;
        await pool.query(
            `INSERT INTO alternatives (question_id, position, alternative_text, is_correct)
             VALUES (?, 1, 'Correta', TRUE), (?, 2, 'Incorreta', FALSE)`,
            [questionId, questionId]
        );
        const [alternatives] = await pool.query(
            `SELECT id, position FROM alternatives
             WHERE question_id = ? ORDER BY position`,
            [questionId]
        );
        const correctAlternativeId = alternatives[0].id;
        const incorrectAlternativeId = alternatives[1].id;
        await pool.query(
            `INSERT INTO exam_questions (exam_id, question_id, question_order, score)
             VALUES (?, ?, 1, 2.50)`,
            [examId, questionId]
        );
        const [application] = await pool.query(
            `INSERT INTO applications (exam_id, class_id, teacher_id, status)
             VALUES (?, ?, ?, 'in_correction')`,
            [examId, classId, teacherId]
        );
        applicationId = application.insertId;
        const qrCodePayload = `${RUN}-assignment`;
        const [version] = await pool.query(
            `INSERT INTO exam_versions
                (application_id, version_number, public_code, qr_code_payload)
             VALUES (?, 1, ?, ?)`,
            [applicationId, `${RUN}-v1`, `${RUN}-version`]
        );
        versionId = version.insertId;
        await pool.query(
            `INSERT INTO exam_version_questions (exam_version_id, question_id, printed_order)
             VALUES (?, ?, 1)`,
            [versionId, questionId]
        );
        await pool.query(
            `INSERT INTO exam_version_alternatives
                (exam_version_id, question_id, alternative_id, printed_order)
             VALUES (?, ?, ?, 1), (?, ?, ?, 2)`,
            [
                versionId, questionId, correctAlternativeId,
                versionId, questionId, incorrectAlternativeId
            ]
        );
        const [assignment] = await pool.query(
            `INSERT INTO exam_assignments (exam_version_id, student_id, qr_code_payload)
             VALUES (?, ?, ?)`,
            [versionId, studentId, qrCodePayload]
        );
        assignmentId = assignment.insertId;

        const applicationDetails = await call('GET', `/api/applications/${applicationId}`);
        expect(applicationDetails.status).toBe(200);
        expect(applicationDetails.body.data.id).toBe(applicationId);

        const context = await call(
            'GET',
            `/api/corrections/context?code=${encodeURIComponent(qrCodePayload)}`
        );
        expect(context.status).toBe(200);
        expect(context.body.data).toMatchObject({
            applicationId,
            examVersionId: versionId,
            assignedStudentId: studentId
        });
        expect(JSON.stringify(context.body)).not.toContain('isCorrect');

        const correction = await call('POST', '/api/corrections', {
            qrCodePayload,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        });
        expect(correction.status).toBe(201);
        expect(correction.body.data.totalScore).toBe(2.5);
        correctionId = correction.body.data.id;

        const logout = await call('POST', '/api/auth/logout');
        expect(logout.status).toBe(204);
        const afterLogout = await call('GET', `/api/applications/${applicationId}`);
        expect(afterLogout.status).toBe(401);
    });
});
