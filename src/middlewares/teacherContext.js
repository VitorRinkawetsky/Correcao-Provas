const DEFAULT_TEACHER_ID = 1;
const { pool } = require('../config/database');
const { ApiError } = require('../http/ApiError');

const createTeacherContext = (database = pool) => async (request, _response, next) => {
    // Authentication middleware must populate one of these server-side contexts.
    // Request headers and payload fields are deliberately not considered.
    const suppliedTeacherId = Number(
        request.authenticatedTeacherId
        ?? request.user?.id
        ?? request.auth?.teacherId
        ?? process.env.TEACHER_ID
    );
    const isSuppliedValid = Number.isSafeInteger(suppliedTeacherId) && suppliedTeacherId > 0;

    if (!isSuppliedValid && process.env.NODE_ENV === 'production') {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Professor nao autenticado'));
        return;
    }

    const teacherId = isSuppliedValid ? suppliedTeacherId : DEFAULT_TEACHER_ID;

    const [rows] = await database.execute(
        'SELECT id FROM professors WHERE id = ? AND is_active = TRUE', [teacherId]
    );
    if (!rows.length) {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Professor inexistente ou inativo'));
        return;
    }

    request.teacher = { id: teacherId };
    next();
};

const teacherContext = createTeacherContext();

module.exports = teacherContext;
module.exports.createTeacherContext = createTeacherContext;
