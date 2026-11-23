import { describe, expect, it } from 'vitest';

import service from './reportsService';

const fields = (filters) => {
    try {
        service.validateFilters(filters);
    } catch (error) {
        expect(error.status).toBe(400);
        return error.details.map((detail) => detail.field);
    }
    throw new Error('Era esperado um erro de validação');
};

describe('validação dos filtros de relatório', () => {
    it('aceita filtros ausentes e devolve tudo nulo', () => {
        expect(service.validateFilters({})).toEqual({
            classId: null, applicationId: null, startDate: null, endDate: null
        });
    });

    it('normaliza classId e applicationId numéricos válidos', () => {
        expect(service.validateFilters({ classId: '3', applicationId: 7 })).toEqual({
            classId: 3, applicationId: 7, startDate: null, endDate: null
        });
    });

    it('rejeita classId nao numerico com 400 em vez de devolver relatorio vazio', () => {
        expect(fields({ classId: 'abc' })).toEqual(['classId']);
    });

    it('rejeita classId enviado como lista (query string duplicada)', () => {
        expect(fields({ classId: ['1', '2'] })).toEqual(['classId']);
    });

    it('rejeita datas fora do formato AAAA-MM-DD', () => {
        expect(fields({ startDate: '2026-99-99' })).toEqual(['startDate']);
    });

    it('rejeita intervalo de datas invertido', () => {
        expect(fields({ startDate: '2026-06-01', endDate: '2026-01-01' })).toEqual(['startDate']);
    });
});
