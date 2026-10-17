const { pool } = require('../config/database');
const { ApiError } = require('../http/ApiError');

const createClassTeacherContext = (database = pool) => async (request, _response, next) => {
    // The configured teacher keeps the single-professor demo usable until authentication exists.
    const teacherId = Number(request.session?.teacherId ?? process.env.DEFAULT_TEACHER_ID);
    if (!Number.isSafeInteger(teacherId) || teacherId <= 0) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Professor nao autenticado');
    }
    const [rows] = await database.execute(
        'SELECT id FROM professors WHERE id = ? AND is_active = TRUE', [teacherId]);
    if (!rows.length) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Professor inexistente ou inativo');
    }
    request.teacher = { id: teacherId };
    next();
};

const classTeacherContext = createClassTeacherContext();

module.exports = classTeacherContext;
module.exports.createClassTeacherContext = createClassTeacherContext;
