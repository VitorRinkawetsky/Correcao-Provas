import { describe, expect, it, vi } from 'vitest';

import repository from './correctionsRepository';

describe('repositorio de correcoes sem aluno', () => {
    it('lista somente correcoes identificadas da aplicacao e busca sem curingas SQL', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 1 }]]);

        await repository.listCorrections(9, 7, 'Ana%_', { execute });

        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('c.student_id IS NOT NULL OR c.exam_assignment_id IS NOT NULL');
        expect(sql).toContain('COALESCE(c.student_id, ea.student_id)');
        expect(sql).toContain('a.teacher_id = ?');
        expect(sql).toContain('INSTR(LOWER(s.full_name), LOWER(?)) > 0');
        expect(sql).toContain('COUNT(ca.question_id)');
        expect(params).toEqual([9, 7, 'Ana%_', 'Ana%_']);
    });

    it('lista versoes somente da aplicacao pertencente ao professor', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 12 }]]);

        await repository.listVersions(9, 7, { execute });

        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('ev.application_id = ?');
        expect(sql).toContain('a.teacher_id = ?');
        expect(params).toEqual([9, 7]);
    });

    it('carrega gabarito e peso na ordem impressa, sempre no escopo do professor', async () => {
        const execute = vi.fn().mockResolvedValue([[]]);

        await repository.listVersionAnswerKey(12, 7, { execute });

        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('eq.score');
        expect(sql).toContain('alt.is_correct');
        expect(sql).toContain('eva.alternative_id');
        expect(sql).toContain('a.teacher_id = ?');
        expect(sql).toContain('ORDER BY evq.printed_order ASC, eva.printed_order ASC');
        expect(params).toEqual([12, 7]);
    });

    it('bloqueia a versao proprietaria e a verificacao de duplicidade', async () => {
        const execute = vi.fn()
            .mockResolvedValueOnce([[{ id: 12 }]])
            .mockResolvedValueOnce([[{ id: 88 }]]);
        const db = { execute };

        await repository.findOwnedVersionForUpdate(12, 7, db);
        await repository.findCorrectionConflict(12, 31, 55, db);

        expect(execute.mock.calls[0][0].trim()).toMatch(/FOR UPDATE$/);
        expect(execute.mock.calls[0][1]).toEqual([12, 7]);
        expect(execute.mock.calls[1][0]).toContain('c.exam_version_id = ? AND c.student_id = ?');
        expect(execute.mock.calls[1][0]).toContain('c.exam_assignment_id = ?');
        expect(execute.mock.calls[1][0].trim()).toMatch(/FOR UPDATE$/);
        expect(execute.mock.calls[1][1]).toEqual([12, 31, 55, 55]);
    });

    it('insere cabecalho e todas as respostas usando o mesmo handle transacional', async () => {
        const execute = vi.fn().mockResolvedValue([{ insertId: 88 }]);
        const query = vi.fn().mockResolvedValue([{ affectedRows: 2 }]);
        const db = { execute, query };

        const correctionId = await repository.insertCorrection({
            examAssignmentId: 55,
            examVersionId: 12,
            studentId: 31,
            status: 'confirmed',
            totalScore: 1.25,
            notes: null,
            correctedBy: 7
        }, db);
        await repository.insertCorrectionAnswers(correctionId, [
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
        ], db);

        expect(correctionId).toBe(88);
        expect(execute.mock.calls[0][0]).toContain('INSERT INTO corrections');
        expect(execute.mock.calls[0][0]).toContain('CURRENT_TIMESTAMP(3)');
        expect(query.mock.calls[0][0]).toContain('INSERT INTO correction_answers');
        expect(query.mock.calls[0][1][0]).toEqual([
            [88, 101, 1001, 1, 1.25],
            [88, 102, null, 0, 0]
        ]);
    });

    it('lista apenas pendencias da aplicacao pertencente ao professor', async () => {
        const rows = [{ id: 17 }];
        const execute = vi.fn().mockResolvedValue([rows]);

        const result = await repository.listPending(9, 7, { execute });

        expect(result).toEqual(rows);
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('ev.application_id = ?');
        expect(sql).toContain('a.teacher_id = ?');
        expect(sql).toContain('c.student_id IS NULL');
        expect(sql).toContain('c.exam_assignment_id IS NULL');
        expect(params).toEqual([9, 7]);
    });

    it('lista somente alunos ativos e ativos na turma da aplicacao', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 31 }]]);

        await repository.listApplicationStudents(9, 7, { execute });

        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain("cs.status = 'active'");
        expect(sql).toContain("s.status = 'active'");
        expect(sql).toContain('a.teacher_id = ?');
        expect(params).toEqual([9, 7]);
    });

    it('bloqueia a correcao enquanto valida propriedade e estado atual', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 17 }]]);

        await repository.findCorrectionForUpdate(17, 7, { execute });

        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('a.teacher_id = ?');
        expect(sql.trim()).toMatch(/FOR UPDATE$/);
        expect(params).toEqual([17, 7]);
    });

    it('busca o aluno pela turma e bloqueia somente vinculo ativo', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 31 }]]);

        await repository.findStudentForUpdate(31, 4, { execute });

        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain("cs.status = 'active'");
        expect(sql).toContain("s.status = 'active'");
        expect(sql.trim()).toMatch(/FOR UPDATE$/);
        expect(params).toEqual([4, 31]);
    });

    it('busca somente a atribuicao da mesma versao e do aluno selecionado', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 55 }]]);

        const result = await repository.findAssignment(12, 31, { execute });

        expect(result).toEqual({ id: 55 });
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('exam_version_id = ? AND student_id = ?');
        expect(sql.trim()).toMatch(/FOR UPDATE$/);
        expect(params).toEqual([12, 31]);
    });

    it('procura conflitos por versao/aluno e por atribuicao', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 99 }]]);

        const result = await repository.findAssociationConflict(17, 12, 31, 55, { execute });

        expect(result).toEqual({ id: 99 });
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('c.exam_version_id = ? AND c.student_id = ?');
        expect(sql).toContain('c.exam_assignment_id = ?');
        expect(sql.trim()).toMatch(/FOR UPDATE$/);
        expect(params).toEqual([17, 12, 31, 55, 55]);
    });

    it('atualiza somente os identificadores e mantem os campos reportados no historico', async () => {
        const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);

        const affectedRows = await repository.updateAssociation(17, 31, 55, { execute });

        expect(affectedRows).toBe(1);
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toContain('SET student_id = ?, exam_assignment_id = ?');
        expect(sql).toContain('student_id IS NULL');
        expect(sql).toContain('exam_assignment_id IS NULL');
        expect(sql).not.toContain('reported_student_name =');
        expect(sql).not.toContain('reported_student_registration =');
        expect(params).toEqual([31, 55, 17]);
    });
});
