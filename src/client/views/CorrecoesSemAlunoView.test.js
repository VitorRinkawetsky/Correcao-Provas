// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    associateCorrection,
    listApplicationStudents,
    listPendingCorrections
} = vi.hoisted(() => ({
    associateCorrection: vi.fn(),
    listApplicationStudents: vi.fn(),
    listPendingCorrections: vi.fn()
}));

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ params: { id: '9' } })
}));

vi.mock('../services/correctionsApi', () => ({
    associateCorrection,
    listApplicationStudents,
    listPendingCorrections
}));

import CorrecoesSemAlunoView from './CorrecoesSemAlunoView.vue';

const pending = [
    {
        id: 17,
        applicationId: 9,
        examVersionId: 12,
        versionNumber: 1,
        reportedStudentName: 'Ana informada',
        reportedStudentRegistration: '20260042',
        totalScore: 8.5,
        status: 'confirmed'
    },
    {
        id: 18,
        applicationId: 9,
        examVersionId: 13,
        versionNumber: 2,
        reportedStudentName: 'Bruno informado',
        reportedStudentRegistration: '20260043',
        totalScore: 7,
        status: 'pending'
    }
];

const students = [
    { id: 31, fullName: 'Ana Souza', registration: '20260042' },
    { id: 32, fullName: 'Bruno Lima', registration: '20260043' }
];

beforeEach(() => {
    vi.clearAllMocks();
    listPendingCorrections.mockResolvedValue(pending.map((item) => ({ ...item })));
    listApplicationStudents.mockResolvedValue(students.map((item) => ({ ...item })));
    associateCorrection.mockResolvedValue({ id: 17, studentId: 31 });
});

describe('tela de correcoes sem aluno', () => {
    it('exibe os dados reportados e busca somente entre alunos da aplicacao', async () => {
        const wrapper = mount(CorrecoesSemAlunoView);
        await flushPromises();

        expect(listPendingCorrections).toHaveBeenCalledWith('9');
        expect(listApplicationStudents).toHaveBeenCalledWith('9');
        expect(wrapper.text()).toContain('Ana informada');
        expect(wrapper.text()).toContain('20260042');

        const firstCard = wrapper.get('[data-correction-id="17"]');
        await firstCard.get('input[type="search"]').setValue('Bruno');

        expect(firstCard.get('select').text()).toContain('Bruno Lima');
        expect(firstCard.get('select').text()).not.toContain('Ana Souza');
        expect(firstCard.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    });

    it('remove somente a pendencia associada com sucesso', async () => {
        const wrapper = mount(CorrecoesSemAlunoView);
        await flushPromises();
        const firstCard = wrapper.get('[data-correction-id="17"]');

        await firstCard.get('select').setValue('31');
        await firstCard.get('form').trigger('submit');
        await flushPromises();

        expect(associateCorrection).toHaveBeenCalledWith(17, { studentId: 31 });
        expect(wrapper.find('[data-correction-id="17"]').exists()).toBe(false);
        expect(wrapper.find('[data-correction-id="18"]').exists()).toBe(true);
    });

    it('mantem a pendencia e apresenta o erro quando a associacao e invalida', async () => {
        associateCorrection.mockRejectedValue(new Error(
            'A matricula do aluno nao corresponde a informada na correcao.'
        ));
        const wrapper = mount(CorrecoesSemAlunoView);
        await flushPromises();
        const firstCard = wrapper.get('[data-correction-id="17"]');

        await firstCard.get('input[type="search"]').setValue('Bruno');
        await firstCard.get('select').setValue('32');
        await firstCard.get('form').trigger('submit');
        await flushPromises();

        expect(wrapper.find('[data-correction-id="17"]').exists()).toBe(true);
        expect(wrapper.get('[data-correction-id="17"] [role="alert"]').text())
            .toContain('matricula');
    });

    it('mantem carregamento independente por correcao', async () => {
        let finishAssociation;
        associateCorrection.mockReturnValue(new Promise((resolve) => {
            finishAssociation = resolve;
        }));
        const wrapper = mount(CorrecoesSemAlunoView);
        await flushPromises();
        const firstCard = wrapper.get('[data-correction-id="17"]');
        const secondCard = wrapper.get('[data-correction-id="18"]');

        await firstCard.get('select').setValue('31');
        await firstCard.get('form').trigger('submit');

        expect(firstCard.get('button[type="submit"]').attributes('disabled')).toBeDefined();
        expect(firstCard.get('button[type="submit"]').text()).toContain('Associando');
        expect(secondCard.get('button[type="submit"]').attributes('disabled')).toBeUndefined();

        finishAssociation({ id: 17, studentId: 31 });
        await flushPromises();
    });

    it('nao oferece criacao de conta, senha ou login para aluno', async () => {
        const wrapper = mount(CorrecoesSemAlunoView);
        await flushPromises();

        expect(wrapper.find('input[type="password"]').exists()).toBe(false);
        expect(wrapper.find('[name="email"]').exists()).toBe(false);
        expect(wrapper.find('[name="password"]').exists()).toBe(false);
        expect(wrapper.text().toLowerCase()).not.toContain('criar conta');
        expect(wrapper.text().toLowerCase()).not.toContain('login de aluno');
    });
});
