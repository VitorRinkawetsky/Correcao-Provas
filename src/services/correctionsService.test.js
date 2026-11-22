import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import database from '../config/database';
import applicationVersionsRepository from '../repositories/applicationVersionsRepository';
import correctionsRepository from '../repositories/correctionsRepository';
import questionsService from './questionsService';
import service from './correctionsService';

const { pool, closeDatabaseConnection } = database;

// Exercita o fluxo real de correção (QR code -> resposta -> gravação) contra o
// MySQL com o schema de database/init.sql. Sem banco disponível, a suíte é ignorada.
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);

const RUN = `__test_corr_${Date.now()}`;

let teacherId;
let classId;
let examId;
let applicationId;
let questionId;
let correctAlternativeId;
let version;

describe.skipIf(!databaseAvailable)('correctionsService (MySQL)', () => {
    beforeAll(async () => {
        const [professor] = await pool.query(
            'INSERT INTO professors (full_name, email) VALUES (?, ?)',
            [`${RUN} professor`, `${RUN}@teste.local`]
        );
        teacherId = professor.insertId;

        const [classRow] = await pool.query(
            'INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code) VALUES (?, ?, ?, ?, ?)',
            [teacherId, `${RUN} turma`, 'Banco de Dados', '2026/2', `${RUN}`.slice(-20)]
        );
        classId = classRow.insertId;

        const question = await questionsService.create(teacherId, {
            statement: `${RUN} Qual a capital do Brasil?`,
            alternatives: [{ text: 'Brasília' }, { text: 'Rio de Janeiro' }],
            correctAlternativeIndex: 0
        });
        questionId = question.id;
        correctAlternativeId = question.alternatives.find((alternative) => alternative.isCorrect).id;

        const [examRow] = await pool.query(
            'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
            [teacherId, `${RUN} prova`]
        );
        examId = examRow.insertId;
        await pool.query(
            'INSERT INTO exam_questions (exam_id, question_id, question_order, score) VALUES (?, ?, 1, 10)',
            [examId, questionId]
        );

        const [applicationRow] = await pool.query(
            'INSERT INTO applications (exam_id, class_id, teacher_id) VALUES (?, ?, ?)',
            [examId, classId, teacherId]
        );
        applicationId = applicationRow.insertId;

        const [created] = await applicationVersionsRepository.generateVersions(applicationId, teacherId, [
            { embaralharQuestoes: false, embaralharAlternativas: false, identificacao: false }
        ]);
        version = created;
    });

    afterAll(async () => {
        if (applicationId) {
            await pool.query(
                'DELETE ca FROM correction_answers ca INNER JOIN corrections c ON c.id = ca.correction_id ' +
                'INNER JOIN exam_versions ev ON ev.id = c.exam_version_id WHERE ev.application_id = ?',
                [applicationId]
            );
            await pool.query(
                'DELETE c FROM corrections c INNER JOIN exam_versions ev ON ev.id = c.exam_version_id ' +
                'WHERE ev.application_id = ?',
                [applicationId]
            );
            await pool.query('DELETE FROM exam_version_alternatives WHERE exam_version_id IN ' +
                '(SELECT id FROM exam_versions WHERE application_id = ?)', [applicationId]);
            await pool.query('DELETE FROM exam_version_questions WHERE exam_version_id IN ' +
                '(SELECT id FROM exam_versions WHERE application_id = ?)', [applicationId]);
            await pool.query('DELETE FROM exam_versions WHERE application_id = ?', [applicationId]);
            await pool.query('DELETE FROM applications WHERE id = ?', [applicationId]);
        }
        if (examId) {
            await pool.query('DELETE FROM exam_questions WHERE exam_id = ?', [examId]);
            await pool.query('DELETE FROM exams WHERE id = ?', [examId]);
        }
        if (questionId) {
            await pool.query('DELETE FROM alternatives WHERE question_id = ?', [questionId]);
            await pool.query('DELETE FROM questions WHERE id = ?', [questionId]);
        }
        if (classId) await pool.query('DELETE FROM classes WHERE id = ?', [classId]);
        if (teacherId) await pool.query('DELETE FROM professors WHERE id = ?', [teacherId]);
        await closeDatabaseConnection();
    });

    it('aceita o public_code (digitado manualmente), nao apenas o qr_code_payload', async () => {
        const result = await service.correct(teacherId, {
            qrCodePayload: version.publicCode,
            studentRegistration: `${RUN}-aluno1`,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        });

        expect(result.totalScore).toBe(10);
    });

    it('rejeita com 409 ao corrigir a mesma prova duas vezes para o mesmo aluno', async () => {
        await expect(service.correct(teacherId, {
            qrCodePayload: version.publicCode,
            studentRegistration: `${RUN}-aluno1`,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        })).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_CORRECTION' });
    });

    it('rejeita com 400 quando selectedAlternativeId nao e numerico, em vez de salvar como sem resposta', async () => {
        await expect(service.correct(teacherId, {
            qrCodePayload: version.publicCode,
            studentRegistration: `${RUN}-aluno2`,
            answers: [{ questionId, selectedAlternativeId: 'abc' }]
        })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    it('rejeita com 400 quando o nome informado excede o tamanho maximo da coluna', async () => {
        await expect(service.correct(teacherId, {
            qrCodePayload: version.publicCode,
            studentName: 'A'.repeat(200),
            studentRegistration: `${RUN}-aluno3`,
            answers: [{ questionId, selectedAlternativeId: correctAlternativeId }]
        })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    it('responde 404 para um codigo de QR invalido', async () => {
        await expect(service.getContext(`${RUN}-codigo-invalido`, teacherId))
            .rejects.toMatchObject({ status: 404, code: 'INVALID_QR_CODE' });
    });

    describe('status da aplicacao e da prova apos as correcoes', () => {
        let classId2;
        let examId2;
        let applicationId2;
        let questionId2;
        let correctAlternativeId2;
        let version2;
        let studentIdA;
        let studentIdB;

        const statusOf = async (table, id) => {
            const [rows] = await pool.query(`SELECT status FROM ${table} WHERE id = ?`, [id]);
            return rows[0]?.status;
        };

        beforeAll(async () => {
            const [classRow] = await pool.query(
                'INSERT INTO classes (teacher_id, name, subject, academic_term, invite_code) VALUES (?, ?, ?, ?, ?)',
                [teacherId, `${RUN} turma status`, 'BD', '2026/2', `${RUN}-st`.slice(-20)]
            );
            classId2 = classRow.insertId;

            const question = await questionsService.create(teacherId, {
                statement: `${RUN} questao status`,
                alternatives: [{ text: 'A' }, { text: 'B' }],
                correctAlternativeIndex: 0
            });
            questionId2 = question.id;
            correctAlternativeId2 = question.alternatives.find((alternative) => alternative.isCorrect).id;

            const [examRow] = await pool.query(
                'INSERT INTO exams (teacher_id, title) VALUES (?, ?)',
                [teacherId, `${RUN} prova status`]
            );
            examId2 = examRow.insertId;
            await pool.query(
                'INSERT INTO exam_questions (exam_id, question_id, question_order, score) VALUES (?, ?, 1, 10)',
                [examId2, questionId2]
            );

            const [applicationRow] = await pool.query(
                'INSERT INTO applications (exam_id, class_id, teacher_id) VALUES (?, ?, ?)',
                [examId2, classId2, teacherId]
            );
            applicationId2 = applicationRow.insertId;

            const [created] = await applicationVersionsRepository.generateVersions(applicationId2, teacherId, [
                { embaralharQuestoes: false, embaralharAlternativas: false, identificacao: false }
            ]);
            version2 = created;

            const [studentA] = await pool.query(
                'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
                [`${RUN} aluno A`, `${RUN}-A`, `${RUN}-a@teste.local`]
            );
            studentIdA = studentA.insertId;
            const [studentB] = await pool.query(
                'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
                [`${RUN} aluno B`, `${RUN}-B`, `${RUN}-b@teste.local`]
            );
            studentIdB = studentB.insertId;
            await pool.query(
                'INSERT INTO class_students (class_id, student_id, status) VALUES (?, ?, ?), (?, ?, ?)',
                [classId2, studentIdA, 'active', classId2, studentIdB, 'active']
            );
        });

        afterAll(async () => {
            if (applicationId2) {
                await pool.query(
                    'DELETE ca FROM correction_answers ca INNER JOIN corrections c ON c.id = ca.correction_id ' +
                    'INNER JOIN exam_versions ev ON ev.id = c.exam_version_id WHERE ev.application_id = ?',
                    [applicationId2]
                );
                await pool.query(
                    'DELETE c FROM corrections c INNER JOIN exam_versions ev ON ev.id = c.exam_version_id ' +
                    'WHERE ev.application_id = ?',
                    [applicationId2]
                );
                await pool.query('DELETE FROM exam_version_alternatives WHERE exam_version_id IN ' +
                    '(SELECT id FROM exam_versions WHERE application_id = ?)', [applicationId2]);
                await pool.query('DELETE FROM exam_version_questions WHERE exam_version_id IN ' +
                    '(SELECT id FROM exam_versions WHERE application_id = ?)', [applicationId2]);
                await pool.query('DELETE FROM exam_versions WHERE application_id = ?', [applicationId2]);
                await pool.query('DELETE FROM applications WHERE id = ?', [applicationId2]);
            }
            if (classId2) {
                await pool.query('DELETE FROM class_students WHERE class_id = ?', [classId2]);
                await pool.query('DELETE FROM classes WHERE id = ?', [classId2]);
            }
            if (studentIdA) await pool.query('DELETE FROM students WHERE id = ?', [studentIdA]);
            if (studentIdB) await pool.query('DELETE FROM students WHERE id = ?', [studentIdB]);
            if (examId2) {
                await pool.query('DELETE FROM exam_questions WHERE exam_id = ?', [examId2]);
                await pool.query('DELETE FROM exams WHERE id = ?', [examId2]);
            }
            if (questionId2) {
                await pool.query('DELETE FROM alternatives WHERE question_id = ?', [questionId2]);
                await pool.query('DELETE FROM questions WHERE id = ?', [questionId2]);
            }
        });

        it('fica "em_correcao" apos a primeira correcao confirmada, sem fechar com alunos pendentes', async () => {
            await service.correct(teacherId, {
                qrCodePayload: version2.publicCode,
                studentRegistration: `${RUN}-A`,
                answers: [{ questionId: questionId2, selectedAlternativeId: correctAlternativeId2 }]
            });

            expect(await statusOf('applications', applicationId2)).toBe('in_correction');
            expect(await statusOf('exams', examId2)).not.toBe('closed');
        });

        it('fica "closed" quando o ultimo aluno ativo da turma e corrigido, e fecha a prova junto', async () => {
            await service.correct(teacherId, {
                qrCodePayload: version2.publicCode,
                studentRegistration: `${RUN}-B`,
                answers: [{ questionId: questionId2, selectedAlternativeId: correctAlternativeId2 }]
            });

            expect(await statusOf('applications', applicationId2)).toBe('closed');
            expect(await statusOf('exams', examId2)).toBe('closed');
        });

        it('volta para "em_correcao" se uma correcao confirmada for apagada (recalculo e sempre a partir do estado atual)', async () => {
            const [[correction]] = await pool.query(
                `SELECT c.id FROM corrections c INNER JOIN exam_versions ev ON ev.id = c.exam_version_id
                 WHERE ev.application_id = ? AND c.reported_student_registration = ?`,
                [applicationId2, `${RUN}-A`]
            );
            await pool.query('DELETE FROM correction_answers WHERE correction_id = ?', [correction.id]);
            await pool.query('DELETE FROM corrections WHERE id = ?', [correction.id]);

            await correctionsRepository.refreshApplicationStatus(applicationId2, pool);

            expect(await statusOf('applications', applicationId2)).toBe('in_correction');
        });
    });
});
