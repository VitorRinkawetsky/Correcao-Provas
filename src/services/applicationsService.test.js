import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import database from '../config/database';
import questionsService from './questionsService';
import service from './applicationsService';

const { pool, closeDatabaseConnection } = database;

// Exercita as validacoes de criacao de aplicacao contra o MySQL com o schema
// de database/init.sql. Sem banco disponivel, a suite e ignorada.
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);

const RUN = `__test_apps_${Date.now()}`;

let teacherId;
let examWithQuestionsId;
let examWithoutQuestionsId;
let examArchivedId;
let classWithStudentsId;
let classWithoutStudentsId;
let studentId;
let questionId;
const applicationIds = [];

describe.skipIf(!databaseAvailable)('applicationsService (MySQL)', () => {
    beforeAll(async () => {
        const [professor] = await pool.query(
            'INSERT INTO professors (full_name, email) VALUES (?, ?)',
            [`${RUN} professor`, `${RUN}@teste.local`]
        );
        teacherId = professor.insertId;

        const question = await questionsService.create(teacherId, {
            statement: `${RUN} questao`,
            alternatives: [{ text: 'A' }, { text: 'B' }],
            correctAlternativeIndex: 0
        });
        questionId = question.id;

        const [examWithQuestions] = await pool.query(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)', [teacherId, `${RUN} prova com questoes`]
        );
        examWithQuestionsId = examWithQuestions.insertId;
        await pool.query(
            'INSERT INTO exam_questions (exam_id, question_id, question_order, score) VALUES (?, ?, 1, 10)',
            [examWithQuestionsId, questionId]
        );

        const [examWithoutQuestions] = await pool.query(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)', [teacherId, `${RUN} prova sem questoes`]
        );
        examWithoutQuestionsId = examWithoutQuestions.insertId;

        const [examArchived] = await pool.query(
            "INSERT INTO exams (teacher_id, title, status) VALUES (?, ?, 'archived')",
            [teacherId, `${RUN} prova arquivada`]
        );
        examArchivedId = examArchived.insertId;

        const [classWithStudents] = await pool.query(
            'INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code) VALUES (?, ?, ?, ?, ?)',
            [teacherId, `${RUN} turma com alunos`, 'BD', '2026/2', `${RUN}-1`.slice(-20)]
        );
        classWithStudentsId = classWithStudents.insertId;

        const [classWithoutStudents] = await pool.query(
            'INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code) VALUES (?, ?, ?, ?, ?)',
            [teacherId, `${RUN} turma sem alunos`, 'BD', '2026/2', `${RUN}-2`.slice(-20)]
        );
        classWithoutStudentsId = classWithoutStudents.insertId;

        const [student] = await pool.query(
            'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
            [`${RUN} aluno`, `${RUN}-matricula`, `${RUN}-aluno@teste.local`]
        );
        studentId = student.insertId;
        await pool.query(
            'INSERT INTO class_students (class_id, student_id, status) VALUES (?, ?, ?)',
            [classWithStudentsId, studentId, 'active']
        );
    });

    afterAll(async () => {
        if (applicationIds.length) {
            await pool.query('DELETE FROM applications WHERE id IN (?)', [applicationIds]);
        }
        if (classWithStudentsId) {
            await pool.query('DELETE FROM class_students WHERE class_id = ?', [classWithStudentsId]);
            await pool.query('DELETE FROM classes WHERE id = ?', [classWithStudentsId]);
        }
        if (classWithoutStudentsId) await pool.query('DELETE FROM classes WHERE id = ?', [classWithoutStudentsId]);
        if (studentId) await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
        for (const examId of [examWithQuestionsId, examWithoutQuestionsId, examArchivedId]) {
            if (examId) {
                await pool.query('DELETE FROM exam_questions WHERE exam_id = ?', [examId]);
                await pool.query('DELETE FROM exams WHERE id = ?', [examId]);
            }
        }
        if (questionId) {
            await pool.query('DELETE FROM alternatives WHERE question_id = ?', [questionId]);
            await pool.query('DELETE FROM questions WHERE id = ?', [questionId]);
        }
        if (teacherId) await pool.query('DELETE FROM professors WHERE id = ?', [teacherId]);
        await closeDatabaseConnection();
    });

    it('rejeita com 409 quando a prova nao possui questoes', async () => {
        await expect(service.create(teacherId, {
            examId: examWithoutQuestionsId, classId: classWithStudentsId
        })).rejects.toMatchObject({ status: 409, code: 'EXAM_WITHOUT_QUESTIONS' });
    });

    it('rejeita com 409 quando a prova esta arquivada', async () => {
        await expect(service.create(teacherId, {
            examId: examArchivedId, classId: classWithStudentsId
        })).rejects.toMatchObject({ status: 409, code: 'EXAM_LOCKED' });
    });

    it('rejeita com 409 quando a turma nao possui alunos matriculados', async () => {
        await expect(service.create(teacherId, {
            examId: examWithQuestionsId, classId: classWithoutStudentsId
        })).rejects.toMatchObject({ status: 409, code: 'CLASS_WITHOUT_STUDENTS' });
    });

    it('cria a aplicacao quando a prova tem questoes e a turma tem alunos ativos', async () => {
        const application = await service.create(teacherId, {
            examId: examWithQuestionsId, classId: classWithStudentsId
        });
        applicationIds.push(application.id);

        expect(application).toMatchObject({ examId: examWithQuestionsId, classId: classWithStudentsId });
    });
});
