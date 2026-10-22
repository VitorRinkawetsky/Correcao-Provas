const correctionsService = require('../services/correctionsService');

const success = (response, data, status = 200) => response.status(status).json({
    data,
    meta: {}
});

module.exports = {
    context: async (request, response) => success(
        response,
        await correctionsService.getContext(request.query.code, request.teacher.id)
    ),
    create: async (request, response) => success(
        response,
        await correctionsService.correct(request.teacher.id, request.body),
        201
    )
};
