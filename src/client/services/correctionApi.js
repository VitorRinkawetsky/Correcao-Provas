import { requestJson } from './apiClient';

export const getCorrectionContext = (code) => requestJson(
    `/api/corrections/context?code=${encodeURIComponent(code)}`
);

export const createCorrection = (payload) => requestJson('/api/corrections', {
    method: 'POST',
    body: JSON.stringify(payload)
});
