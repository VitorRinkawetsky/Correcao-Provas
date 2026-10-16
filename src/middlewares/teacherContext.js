function requireTeacher(req, res, next) {
    let id = req.user?.id;

    if (!id && process.env.NODE_ENV !== 'production') {
        id =
            Number(req.get('X-Dev-Teacher-Id')) ||
            Number(process.env.DEV_TEACHER_ID) ||
            1;
    }

    const teacherId = Number(id);

    if (!Number.isInteger(teacherId) || teacherId <= 0) {
        return res.status(401).json({
            status: 'error',
            message: 'Não autenticado.'
        });
    }

    req.teacherId = teacherId;
    next();
}

module.exports = requireTeacher;