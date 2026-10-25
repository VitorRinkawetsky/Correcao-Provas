import { requestJson } from './apiClient';

export const listCorrections = (applicationId, search = '') => {
    const params = new URLSearchParams({ applicationId: String(applicationId) });
    if (search) params.set('search', search);
    return requestJson(`/api/corrections?${params.toString()}`);
};

export const getCorrectionFormOptions = (applicationId) =>
    requestJson(`/api/corrections/applications/${applicationId}/form-options`);

export const getVersionQuestions = (versionId) =>
    requestJson(`/api/corrections/versions/${versionId}/questions`);

export const createCorrection = (payload) =>
    requestJson('/api/corrections', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

export const listPendingCorrections = (applicationId) =>
    requestJson(`/api/corrections/applications/${applicationId}/pending`);

export const listApplicationStudents = (applicationId) =>
    requestJson(`/api/corrections/applications/${applicationId}/students`);

export const associateCorrection = (correctionId, payload) =>
    requestJson(`/api/corrections/${correctionId}/student`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
