const DEFAULT_TEACHER_ID = 1;
const { ApiError } = require('../http/ApiError');

module.exports = (request, _response, next) => {
    // Authentication middleware must populate one of these server-side contexts.
    // Request headers and payload fields are deliberately not considered.
    const teacherId = Number(
        request.authenticatedTeacherId
        ?? request.user?.id
        ?? request.auth?.teacherId
        ?? process.env.TEACHER_ID
    );

    if ((!Number.isSafeInteger(teacherId) || teacherId < 1)
        && process.env.NODE_ENV === 'production') {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Professor nao autenticado'));
        return;
    }

    request.teacher = {
        id: Number.isSafeInteger(teacherId) && teacherId > 0
            ? teacherId
            : DEFAULT_TEACHER_ID
    };
    next();
};
