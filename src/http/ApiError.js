class ApiError extends Error {
    constructor(status, code, message, details = []) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

const handleApiError = (error, _request, response, _next) => {
    if (error instanceof ApiError) {
        return response.status(error.status).json({
            error: { code: error.code, message: error.message, details: error.details }
        });
    }
    if (error.type === 'entity.parse.failed') {
        return response.status(400).json({ error: {
            code: 'VALIDATION_ERROR', message: 'JSON invalido', details: []
        } });
    }
    if (error.code === 'ER_DUP_ENTRY') {
        return response.status(409).json({ error: {
            code: 'CONFLICT', message: 'E-mail, matricula ou codigo ja cadastrado', details: []
        } });
    }
    console.error('Falha na API:', error);
    const unavailable = ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST',
        'ER_CON_COUNT_ERROR', 'ENOTFOUND'].includes(error.code);
    return response.status(unavailable ? 503 : 500).json({ error: {
        code: unavailable ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR',
        message: unavailable ? 'Banco de dados indisponivel' : 'Nao foi possivel concluir a requisicao',
        details: []
    } });
};

module.exports = { ApiError, handleApiError };
