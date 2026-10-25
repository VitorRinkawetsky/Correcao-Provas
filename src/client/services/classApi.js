import { reportUnauthorized } from './apiClient';

const request = async (path = '', options = {}) => {
    const url = `/api/classes${path}`;
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: { Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}) }
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !Object.hasOwn(payload, 'data')) {
        const error = new Error(payload?.error?.message || 'Nao foi possivel acessar as turmas');
        error.code = payload?.error?.code;
        error.status = response.status;
        if (response.status === 401) reportUnauthorized(url, error);
        throw error;
    }
    return payload.data;
};

const body = (data, method = 'POST') => ({ method, body: JSON.stringify(data) });

export const getClasses = () => request();
export const getClass = (id) => request(`/${id}`);
export const createClass = (data) => request('', body(data));
export const updateClass = (id, data) => request(`/${id}`, body(data, 'PUT'));
export const archiveClass = (id) => request(`/${id}`, { method: 'DELETE' });
export const regenerateClassInviteCode = (id) => request(`/${id}/invite-code`, { method: 'POST' });
export const getClassStudents = (id) => request(`/${id}/students`);
export const addStudentToClass = (id, data) => request(`/${id}/students`, body(data));
export const removeStudentFromClass = (id, studentId) => request(`/${id}/students/${studentId}`, { method: 'DELETE' });
export const getClassStudentGrades = (id, studentId) => request(`/${id}/students/${studentId}/grades`);
