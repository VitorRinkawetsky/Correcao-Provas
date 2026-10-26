const { ApiError } = require('../http/ApiError');

module.exports = (request, _response, next) => {
    const teacherId = Number(request.authenticatedTeacherId);

    if (!Number.isSafeInteger(teacherId) || teacherId < 1) {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Professor nao autenticado.'));
        return;
    }

    request.teacher = { id: teacherId };
    next();
};

