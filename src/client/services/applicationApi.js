
import { requestJson } from './apiClient';

export const getApplication = (id) =>
    requestJson(`/api/applications/${id}`);

export const createApplication = (payload) =>
    requestJson('/api/applications', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
