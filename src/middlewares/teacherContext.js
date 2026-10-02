const DEFAULT_TEACHER_ID = 1;

module.exports = (request, _response, next) => {
    const headerTeacherId = Number(request.get('x-teacher-id'));
    request.teacher = {
        id: Number.isSafeInteger(headerTeacherId) && headerTeacherId > 0
            ? headerTeacherId
            : DEFAULT_TEACHER_ID
    };
    next();
};
