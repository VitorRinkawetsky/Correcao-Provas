const { SESSION_TTL_MS } = require('../config/auth');

const SESSION_COOKIE_NAME = 'sgp_session';
const insecureCookieEnvironments = new Set(['development', 'test']);
const getSessionCookieOptions = (environment = process.env.NODE_ENV) => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: !insecureCookieEnvironments.has(environment),
    path: '/'
});

const readSessionCookie = (request) => {
    const cookieHeader = request.headers?.cookie;
    if (typeof cookieHeader !== 'string') return null;

    for (const part of cookieHeader.split(';')) {
        const separator = part.indexOf('=');
        if (separator < 0) continue;

        const name = part.slice(0, separator).trim();
        if (name === SESSION_COOKIE_NAME) {
            return part.slice(separator + 1).trim() || null;
        }
    }

    return null;
};

const setSessionCookie = (response, token) => response.cookie(
    SESSION_COOKIE_NAME,
    token,
    { ...getSessionCookieOptions(), maxAge: SESSION_TTL_MS }
);

const clearSessionCookie = (response) => response.clearCookie(
    SESSION_COOKIE_NAME,
    getSessionCookieOptions()
);

module.exports = {
    SESSION_COOKIE_NAME,
    getSessionCookieOptions,
    readSessionCookie,
    setSessionCookie,
    clearSessionCookie
};
