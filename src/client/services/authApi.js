import { requestJson } from './apiClient';

export const registerProfessor = ({ fullName, email, password }) => requestJson(
    '/api/auth/register',
    {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password })
    }
);

export const loginProfessor = ({ email, password }) => requestJson(
    '/api/auth/login',
    {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }
);

export const getCurrentProfessor = () => requestJson('/api/auth/me');

export const logoutProfessor = () => requestJson('/api/auth/logout', {
    method: 'POST'
});
