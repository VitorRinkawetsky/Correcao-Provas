import { describe, expect, it, vi } from 'vitest';

import { ApiError, handleApiError } from './ApiError';

const mockResponse = () => {
    const response = { statusCode: null, body: null };
    response.status = vi.fn((code) => { response.statusCode = code; return response; });
    response.json = vi.fn((body) => { response.body = body; return response; });
    return response;
};

describe('handleApiError', () => {
    it('devolve o status e o codigo de uma ApiError', () => {
        const response = mockResponse();
        handleApiError(new ApiError(404, 'NOT_FOUND', 'Prova nao encontrada'), {}, response, () => {});

        expect(response.statusCode).toBe(404);
        expect(response.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Prova nao encontrada' });
    });

    it('devolve 400 para JSON malformado', () => {
        const response = mockResponse();
        handleApiError({ type: 'entity.parse.failed' }, {}, response, () => {});

        expect(response.statusCode).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('devolve 413 para corpo de requisicao maior que o limite, em vez de 500', () => {
        const response = mockResponse();
        handleApiError({ type: 'entity.too.large' }, {}, response, () => {});

        expect(response.statusCode).toBe(413);
        expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('devolve 409 para entrada duplicada no banco', () => {
        const response = mockResponse();
        handleApiError({ code: 'ER_DUP_ENTRY' }, {}, response, () => {});

        expect(response.statusCode).toBe(409);
        expect(response.body.error.code).toBe('CONFLICT');
    });

    it('devolve 503 quando o banco esta indisponivel e 500 para qualquer outro erro', () => {
        const unavailable = mockResponse();
        handleApiError({ code: 'ECONNREFUSED' }, {}, unavailable, () => {});
        expect(unavailable.statusCode).toBe(503);

        const unknown = mockResponse();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        handleApiError(new Error('algo inesperado'), {}, unknown, () => {});
        expect(unknown.statusCode).toBe(500);
        consoleSpy.mockRestore();
    });
});
