const DEFAULT_TEACHER_ID = 1;

module.exports = (request, _response, next) => {
    // The authenticated user is populated by the authentication layer. Until
    // that layer is enabled locally, use the server-side development identity.
    const authenticatedTeacherId = Number(
        request.user?.id || request.auth?.teacherId || process.env.TEACHER_ID || DEFAULT_TEACHER_ID
    );

    request.teacher = {
        id: Number.isSafeInteger(authenticatedTeacherId) && authenticatedTeacherId > 0
            ? authenticatedTeacherId
            : DEFAULT_TEACHER_ID
    };
    next();
};
