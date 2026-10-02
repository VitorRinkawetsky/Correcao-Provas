const { pool } = require('../config/database');
const { ApiError } = require('../http/ApiError');

const classTeacherContext = async (request, _response, next) => {
    // The configured teacher is only a development bridge until authentication exists.
    const teacherId = Number(request.session?.teacherId ||
        (process.env.NODE_ENV !== 'production' ? process.env.DEFAULT_TEACHER_ID : undefined));
    if (!Number.isSafeInteger(teacherId) || teacherId <= 0) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Professor nao autenticado');
    }
    const [rows] = await pool.execute(
        'SELECT id FROM professors WHERE id = ? AND is_active = TRUE', [teacherId]);
    if (!rows.length) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Professor inexistente ou inativo');
    }
    request.teacher = { id: teacherId };
    next();
};

module.exports = classTeacherContext;
