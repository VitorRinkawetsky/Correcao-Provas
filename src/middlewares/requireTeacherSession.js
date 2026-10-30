const service = require('../services/authService');
const { readSessionCookie } = require('../http/authCookie');

const requireTeacherSession = async (request, _response, next) => {
    try {
        const token = readSessionCookie(request);
        const professor = await service.authenticateSession(token);

        request.authenticatedTeacherId = professor.id;
        request.authenticatedProfessor = professor;
        request.teacher = { id: professor.id };
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = requireTeacherSession;
