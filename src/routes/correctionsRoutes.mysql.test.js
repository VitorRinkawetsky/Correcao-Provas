import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import database from '../config/database';
import correctionsRepository from '../repositories/correctionsRepository';
import correctionsRoutes from './correctionsRoutes';
import correctionsService from '../services/correctionsService';

const { pool, closeDatabaseConnection } = database;
const { createCorrectionsService } = correctionsService;
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);
const RUN = `corrections_${Date.now()}`;
const ids = {
    professors: [],
    students: [],
    classes: [],
    exams: [],
    questions: [],
    applications: [],
    versions: [],
    assignments: [],
    corrections: []
};

let teacherA;
let teacherB;
let applicationA;
let studentA;
let studentB;
let assignmentA;
let assignmentB;
let validCorrection;
let mismatchCorrection;
let concurrentCorrection;
let foreignCorrection;
let versionForCreation;
let creationQuestionA;
let creationQuestionB;
let correctAlternativeA;
let wrongAlternativeB;
let server;
let baseUrl;

const insert = async (sql, params, bucket) => {
    const [result] = await pool.query(sql, params);
    ids[bucket].push(result.insertId);
    return result.insertId;
};

const call = async (teacherId, method, path, body) => {
    const response = await fetch(`${baseUrl}/api/corrections${path}`, {
        method,
        headers: {
            'x-test-teacher': String(teacherId),
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: await response.json().catch(() => null)
    };
};

describe.skipIf(!databaseAvailable)('API de correcoes sem aluno (MySQL)', () => {
    beforeAll(async () => {
        teacherA = await insert(
            'INSERT INTO professors (full_name, email) VALUES (?, ?)',
            ['Professor A Correcoes', `${RUN}-a@example.com`],
            'professors'
        );
        teacherB = await insert(
            'INSERT INTO professors (full_name, email) VALUES (?, ?)',
            ['Professor B Correcoes', `${RUN}-b@example.com`],
            'professors'
        );
        studentA = await insert(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            ['Ana Teste', `${RUN}-001`, `${RUN}-student-a@example.com`],
            'students'
        );
        studentB = await insert(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            ['Bruno Teste', `${RUN}-002`, `${RUN}-student-b@example.com`],
            'students'
        );
        const inactiveStudent = await insert(
            `INSERT INTO students (full_name, registration, email, status)
             VALUES (?, ?, ?, 'inactive')`,
            ['Aluno Inativo', `${RUN}-003`, `${RUN}-student-inactive@example.com`],
            'students'
        );
        const foreignStudent = await insert(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            ['Aluno Estrangeiro', `${RUN}-004`, `${RUN}-student-foreign@example.com`],
            'students'
        );

        const classA = await insert(
            `INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code)
             VALUES (?, ?, ?, ?, ?)`,
            [teacherA, 'Turma Correcoes A', 'Banco de Dados', '2026/2', `CA${Date.now()}`],
            'classes'
        );
        const classB = await insert(
            `INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code)
             VALUES (?, ?, ?, ?, ?)`,
            [teacherB, 'Turma Correcoes B', 'Banco de Dados', '2026/2', `CB${Date.now()}`],
            'classes'
        );
        await pool.query(
            `INSERT INTO class_students (class_id, student_id, status)
             VALUES (?, ?, 'active'), (?, ?, 'active'), (?, ?, 'active'), (?, ?, 'active')`,
            [
                classA, studentA,
                classA, studentB,
                classA, inactiveStudent,
                classB, foreignStudent
            ]
        );

        const examA = await insert(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
            [teacherA, 'Prova Correcoes A'],
            'exams'
        );
        const examB = await insert(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
            [teacherB, 'Prova Correcoes B'],
            'exams'
        );
        creationQuestionA = await insert(
            'INSERT INTO questions (teacher_id, statement) VALUES (?, ?)',
            [teacherA, 'Questao de criacao A'],
            'questions'
        );
        creationQuestionB = await insert(
            'INSERT INTO questions (teacher_id, statement) VALUES (?, ?)',
            [teacherA, 'Questao de criacao B'],
            'questions'
        );
        const [alternativeAResult] = await pool.query(
            `INSERT INTO alternatives
                (question_id, position, alternative_text, is_correct)
             VALUES (?, 1, 'Correta A', TRUE), (?, 2, 'Errada A', FALSE)`,
            [creationQuestionA, creationQuestionA]
        );
        correctAlternativeA = alternativeAResult.insertId;
        const [alternativeBResult] = await pool.query(
            `INSERT INTO alternatives
                (question_id, position, alternative_text, is_correct)
             VALUES (?, 1, 'Errada B', FALSE), (?, 2, 'Correta B', TRUE)`,
            [creationQuestionB, creationQuestionB]
        );
        wrongAlternativeB = alternativeBResult.insertId;
        await pool.query(
            `INSERT INTO exam_questions (exam_id, question_id, question_order, score)
             VALUES (?, ?, 1, 1.25), (?, ?, 2, 2.50)`,
            [examA, creationQuestionA, examA, creationQuestionB]
        );
        applicationA = await insert(
            `INSERT INTO applications (exam_id, class_id, teacher_id, status)
             VALUES (?, ?, ?, 'in_correction')`,
            [examA, classA, teacherA],
            'applications'
        );
        const applicationB = await insert(
            `INSERT INTO applications (exam_id, class_id, teacher_id, status)
             VALUES (?, ?, ?, 'in_correction')`,
            [examB, classB, teacherB],
            'applications'
        );

        const versionA1 = await insert(
            `INSERT INTO exam_versions
                (application_id, version_number, public_code, qr_code_payload)
             VALUES (?, 1, ?, ?)`,
            [applicationA, `${RUN}-a-v1`, `${RUN}-a-v1-qr`],
            'versions'
        );
        const versionA2 = await insert(
            `INSERT INTO exam_versions
                (application_id, version_number, public_code, qr_code_payload)
             VALUES (?, 2, ?, ?)`,
            [applicationA, `${RUN}-a-v2`, `${RUN}-a-v2-qr`],
            'versions'
        );
        const versionB = await insert(
            `INSERT INTO exam_versions
                (application_id, version_number, public_code, qr_code_payload)
             VALUES (?, 1, ?, ?)`,
            [applicationB, `${RUN}-b-v1`, `${RUN}-b-v1-qr`],
            'versions'
        );
        versionForCreation = await insert(
            `INSERT INTO exam_versions
                (application_id, version_number, public_code, qr_code_payload)
             VALUES (?, 3, ?, ?)`,
            [applicationA, `${RUN}-a-v3`, `${RUN}-a-v3-qr`],
            'versions'
        );
        await pool.query(
            `INSERT INTO exam_version_questions
                (exam_version_id, question_id, printed_order)
             VALUES (?, ?, 1), (?, ?, 2)`,
            [
                versionForCreation, creationQuestionA,
                versionForCreation, creationQuestionB
            ]
        );
        const [[correctA], [wrongA], [wrongB], [correctB]] = await Promise.all([
            pool.query(
                'SELECT id FROM alternatives WHERE question_id = ? AND position = 1',
                [creationQuestionA]
            ),
            pool.query(
                'SELECT id FROM alternatives WHERE question_id = ? AND position = 2',
                [creationQuestionA]
            ),
            pool.query(
                'SELECT id FROM alternatives WHERE question_id = ? AND position = 1',
                [creationQuestionB]
            ),
            pool.query(
                'SELECT id FROM alternatives WHERE question_id = ? AND position = 2',
                [creationQuestionB]
            )
        ]);
        await pool.query(
            `INSERT INTO exam_version_alternatives
                (exam_version_id, question_id, alternative_id, printed_order)
             VALUES (?, ?, ?, 1), (?, ?, ?, 2), (?, ?, ?, 1), (?, ?, ?, 2)`,
            [
                versionForCreation, creationQuestionA, correctA[0].id,
                versionForCreation, creationQuestionA, wrongA[0].id,
                versionForCreation, creationQuestionB, wrongB[0].id,
                versionForCreation, creationQuestionB, correctB[0].id
            ]
        );

        assignmentA = await insert(
            `INSERT INTO exam_assignments (exam_version_id, student_id, qr_code_payload)
             VALUES (?, ?, ?)`,
            [versionA1, studentA, `${RUN}-assignment-a`],
            'assignments'
        );
        assignmentB = await insert(
            `INSERT INTO exam_assignments (exam_version_id, student_id, qr_code_payload)
             VALUES (?, ?, ?)`,
            [versionA2, studentB, `${RUN}-assignment-b`],
            'assignments'
        );
        await insert(
            `INSERT INTO exam_assignments (exam_version_id, student_id, qr_code_payload)
             VALUES (?, ?, ?)`,
            [versionForCreation, studentA, `${RUN}-assignment-creation`],
            'assignments'
        );

        validCorrection = await insert(
            `INSERT INTO corrections
                (exam_version_id, reported_student_name, reported_student_registration)
             VALUES (?, ?, ?)`,
            [versionA1, 'Ana informada originalmente', `${RUN}-001`],
            'corrections'
        );
        mismatchCorrection = await insert(
            `INSERT INTO corrections
                (exam_version_id, reported_student_name, reported_student_registration)
             VALUES (?, ?, ?)`,
            [versionA1, 'Matricula que deve ser validada', `${RUN}-001`],
            'corrections'
        );
        concurrentCorrection = await insert(
            `INSERT INTO corrections
                (exam_version_id, reported_student_name, reported_student_registration)
             VALUES (?, ?, ?)`,
            [versionA2, 'Bruno informado originalmente', `${RUN}-002`],
            'corrections'
        );
        foreignCorrection = await insert(
            `INSERT INTO corrections
                (exam_version_id, reported_student_name, reported_student_registration)
             VALUES (?, ?, ?)`,
            [versionB, 'Aluno estrangeiro', `${RUN}-004`],
            'corrections'
        );

        const app = express();
        app.use(express.json());
        app.use((request, _response, next) => {
            request.authenticatedTeacherId = Number(request.get('x-test-teacher'));
            next();
        });
        app.use('/api/corrections', correctionsRoutes);
        server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (ids.corrections.length) {
            await pool.query('DELETE FROM corrections WHERE id IN (?)', [ids.corrections]);
        }
        if (ids.assignments.length) {
            await pool.query('DELETE FROM exam_assignments WHERE id IN (?)', [ids.assignments]);
        }
        if (ids.versions.length) {
            await pool.query('DELETE FROM exam_versions WHERE id IN (?)', [ids.versions]);
        }
        if (ids.applications.length) {
            await pool.query('DELETE FROM applications WHERE id IN (?)', [ids.applications]);
        }
        if (ids.exams.length) await pool.query('DELETE FROM exams WHERE id IN (?)', [ids.exams]);
        if (ids.questions.length) {
            await pool.query('DELETE FROM questions WHERE id IN (?)', [ids.questions]);
        }
        if (ids.classes.length) {
            await pool.query('DELETE FROM class_students WHERE class_id IN (?)', [ids.classes]);
            await pool.query('DELETE FROM classes WHERE id IN (?)', [ids.classes]);
        }
        if (ids.students.length) {
            await pool.query('DELETE FROM students WHERE id IN (?)', [ids.students]);
        }
        if (ids.professors.length) {
            await pool.query('DELETE FROM professors WHERE id IN (?)', [ids.professors]);
        }
        await closeDatabaseConnection();
    });

    it('lista somente pendencias e alunos ativos da aplicacao do professor', async () => {
        const pending = await call(teacherA, 'GET', `/applications/${applicationA}/pending`);
        const students = await call(teacherA, 'GET', `/applications/${applicationA}/students`);

        expect(pending.status).toBe(200);
        expect(pending.body.data.map((item) => item.id)).toEqual(expect.arrayContaining([
            validCorrection,
            mismatchCorrection,
            concurrentCorrection
        ]));
        expect(pending.body.data.map((item) => item.id)).not.toContain(foreignCorrection);
        expect(students.status).toBe(200);
        expect(students.body.data.map((item) => item.id)).toEqual([studentA, studentB]);
    });

    it('lista dados reais, protege as consultas auxiliares e nao revela o gabarito', async () => {
        const options = await call(
            teacherA,
            'GET',
            `/applications/${applicationA}/form-options`
        );
        const questions = await call(
            teacherA,
            'GET',
            `/versions/${versionForCreation}/questions`
        );
        const foreignQuestions = await call(
            teacherB,
            'GET',
            `/versions/${versionForCreation}/questions`
        );
        const foreignList = await call(
            teacherB,
            'GET',
            `/?applicationId=${applicationA}`
        );
        const foreignCreate = await call(teacherB, 'POST', '/', {
            examVersionId: versionForCreation,
            studentId: studentA,
            status: 'confirmed',
            notes: null,
            answers: [
                { questionId: creationQuestionA, selectedAlternativeId: correctAlternativeA },
                { questionId: creationQuestionB, selectedAlternativeId: wrongAlternativeB }
            ]
        });

        expect(options.status).toBe(200);
        expect(options.body.data.versions.map((version) => version.id))
            .toContain(versionForCreation);
        expect(options.body.data.students.map((student) => student.id))
            .toEqual([studentA, studentB]);
        expect(questions.status).toBe(200);
        expect(questions.body.data.questions).toHaveLength(2);
        expect(JSON.stringify(questions.body)).not.toContain('isCorrect');
        expect(foreignQuestions.status).toBe(404);
        expect(foreignList.status).toBe(404);
        expect(foreignCreate.status).toBe(404);
    });

    it('faz rollback real quando a insercao das respostas falha depois do cabecalho', async () => {
        const forcedFailure = new Error('falha forcada nas respostas');
        const rollbackService = createCorrectionsService({
            repository: {
                ...correctionsRepository,
                insertCorrectionAnswers: async () => {
                    throw forcedFailure;
                }
            },
            database
        });

        await expect(rollbackService.createCorrection(teacherA, {
            examVersionId: versionForCreation,
            studentId: studentA,
            status: 'confirmed',
            notes: null,
            answers: [
                { questionId: creationQuestionA, selectedAlternativeId: correctAlternativeA },
                { questionId: creationQuestionB, selectedAlternativeId: wrongAlternativeB }
            ]
        })).rejects.toBe(forcedFailure);

        const [[saved]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM corrections
             WHERE exam_version_id = ? AND student_id = ?`,
            [versionForCreation, studentA]
        );
        expect(saved.total).toBe(0);
    });

    it('calcula e persiste cabecalho e respostas, sem aceitar alternativa fora da versao', async () => {
        const invalid = await call(teacherA, 'POST', '/', {
            examVersionId: versionForCreation,
            studentId: studentA,
            status: 'confirmed',
            notes: null,
            answers: [
                { questionId: creationQuestionA, selectedAlternativeId: wrongAlternativeB },
                { questionId: creationQuestionB, selectedAlternativeId: null }
            ]
        });
        expect(invalid.status).toBe(400);

        const [[before]] = await pool.query(
            `SELECT COUNT(*) AS total FROM corrections
             WHERE exam_version_id = ? AND student_id = ?`,
            [versionForCreation, studentA]
        );
        expect(before.total).toBe(0);

        const created = await call(teacherA, 'POST', '/', {
            examVersionId: versionForCreation,
            studentId: studentA,
            status: 'confirmed',
            notes: 'Persistida pela API',
            answers: [
                { questionId: creationQuestionA, selectedAlternativeId: correctAlternativeA },
                { questionId: creationQuestionB, selectedAlternativeId: wrongAlternativeB }
            ]
        });

        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({
            examVersionId: versionForCreation,
            studentId: studentA,
            status: 'confirmed',
            totalScore: 1.25,
            questionCount: 2,
            answeredCount: 2
        });
        ids.corrections.push(created.body.data.id);

        const [savedAnswers] = await pool.query(
            `SELECT question_id AS questionId, is_correct AS isCorrect,
                    awarded_score AS awardedScore
             FROM correction_answers
             WHERE correction_id = ?
             ORDER BY question_id`,
            [created.body.data.id]
        );
        expect(savedAnswers).toEqual([
            { questionId: creationQuestionA, isCorrect: 1, awardedScore: 1.25 },
            { questionId: creationQuestionB, isCorrect: 0, awardedScore: 0 }
        ]);

        const listed = await call(
            teacherA,
            'GET',
            `/?applicationId=${applicationA}&search=${encodeURIComponent(`${RUN}-001`)}`
        );
        expect(listed.status).toBe(200);
        expect(listed.body.data.map((correction) => correction.id))
            .toContain(created.body.data.id);
    });

    it('permite somente um POST concorrente para a mesma versao e aluno', async () => {
        const payload = {
            examVersionId: versionForCreation,
            studentId: studentB,
            status: 'pending',
            notes: null,
            answers: [
                { questionId: creationQuestionA, selectedAlternativeId: correctAlternativeA },
                { questionId: creationQuestionB, selectedAlternativeId: null }
            ]
        };
        const responses = await Promise.all([
            call(teacherA, 'POST', '/', payload),
            call(teacherA, 'POST', '/', payload)
        ]);

        expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
        const successful = responses.find((response) => response.status === 201);
        ids.corrections.push(successful.body.data.id);
        const [[saved]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM corrections
             WHERE exam_version_id = ? AND student_id = ?`,
            [versionForCreation, studentB]
        );
        expect(saved.total).toBe(1);
    });

    it('nao altera a correcao para professor alheio ou matricula divergente', async () => {
        const foreignAttempt = await call(
            teacherB,
            'PUT',
            `/${validCorrection}/student`,
            { studentId: studentA }
        );
        const mismatchAttempt = await call(
            teacherA,
            'PUT',
            `/${mismatchCorrection}/student`,
            { studentId: studentB }
        );

        expect(foreignAttempt.status).toBe(404);
        expect(mismatchAttempt.status).toBe(409);
        const [rows] = await pool.query(
            `SELECT id, student_id AS studentId, exam_assignment_id AS examAssignmentId
             FROM corrections WHERE id IN (?, ?) ORDER BY id`,
            [validCorrection, mismatchCorrection]
        );
        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.studentId === null && row.examAssignmentId === null))
            .toBe(true);
    });

    it('associa aluno e atribuicao, preserva o relato e remove a pendencia', async () => {
        const response = await call(
            teacherA,
            'PUT',
            `/${validCorrection}/student`,
            { studentId: studentA }
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            id: validCorrection,
            studentId: studentA,
            examAssignmentId: assignmentA,
            reportedStudentName: 'Ana informada originalmente',
            reportedStudentRegistration: `${RUN}-001`
        });
        const [[saved]] = await pool.query(
            `SELECT student_id AS studentId, exam_assignment_id AS examAssignmentId,
                    reported_student_name AS reportedStudentName,
                    reported_student_registration AS reportedStudentRegistration
             FROM corrections WHERE id = ?`,
            [validCorrection]
        );
        expect(saved).toEqual({
            studentId: studentA,
            examAssignmentId: assignmentA,
            reportedStudentName: 'Ana informada originalmente',
            reportedStudentRegistration: `${RUN}-001`
        });
        const pending = await call(teacherA, 'GET', `/applications/${applicationA}/pending`);
        expect(pending.body.data.map((item) => item.id)).not.toContain(validCorrection);
    });

    it('permite no maximo um sucesso em associacoes concorrentes da mesma correcao', async () => {
        const responses = await Promise.all([
            call(teacherA, 'PUT', `/${concurrentCorrection}/student`, { studentId: studentB }),
            call(teacherA, 'PUT', `/${concurrentCorrection}/student`, { studentId: studentB })
        ]);

        expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
        const [[saved]] = await pool.query(
            `SELECT student_id AS studentId, exam_assignment_id AS examAssignmentId
             FROM corrections WHERE id = ?`,
            [concurrentCorrection]
        );
        expect(saved).toEqual({ studentId: studentB, examAssignmentId: assignmentB });
    });
});
