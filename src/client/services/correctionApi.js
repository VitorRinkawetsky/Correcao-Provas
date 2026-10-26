import { requestJson } from './apiClient';

export const getCorrectionContext = (code) => requestJson(
    `/api/corrections/context?code=${encodeURIComponent(code)}`
);

export const createCorrection = (payload) => requestJson('/api/corrections', {
    method: 'POST',
    body: JSON.stringify(payload)
});

export const getCorrection = (id) => requestJson(`/api/corrections/${id}`);

export const updateCorrection = (id, payload) => requestJson(`/api/corrections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
});
