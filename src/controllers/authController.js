const service = require('../services/authService');
const {
    readSessionCookie,
    setSessionCookie,
    clearSessionCookie
} = require('../http/authCookie');

const register = async (request, response) => {
    const professor = await service.register(request.body);

    return response.status(201).json({ data: professor, meta: {} });
};

const login = async (request, response) => {
    const { professor, sessionToken } = await service.login(request.body);

    setSessionCookie(response, sessionToken);
    response.set('Cache-Control', 'no-store');
    return response.json({ data: professor, meta: {} });
};

const me = (request, response) => {
    response.set('Cache-Control', 'no-store');
    return response.json({
        data: request.authenticatedProfessor,
        meta: {}
    });
};

const logout = async (request, response) => {
    const sessionToken = readSessionCookie(request);

    await service.logout(sessionToken);
    clearSessionCookie(response);
    return response.status(204).end();
};

module.exports = { register, login, me, logout };
