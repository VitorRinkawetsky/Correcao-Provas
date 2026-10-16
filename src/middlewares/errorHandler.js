const AppError = require('../utils/AppError');

module.exports = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        return res.status(err.status).json({
            status: 'error',
            message: err.message,
            details: err.details
        });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            status: 'error',
            message: 'JSON inválido.'
        });
    }

    console.error('Erro inesperado:', err.message);
    return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor.'
    });
};