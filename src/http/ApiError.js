class ApiError extends Error {
    constructor(status, code, message, details = []) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

const handleApiError = (error, _request, response, next) => {
    if (!error) {
        next();
        return;
    }

    if (error instanceof ApiError) {
        response.status(error.status).json({
            error: {
                code: error.code,
                message: error.message,
                details: error.details
            }
        });
        return;
    }

    console.error(error);
    response.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Nao foi possivel processar a solicitacao'
        }
    });
};

module.exports = {
    ApiError,
    handleApiError
};
