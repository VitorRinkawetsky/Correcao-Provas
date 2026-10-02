import { requestJson } from './apiClient';

export const listExams = () => requestJson('/api/exams');
export const getExamDetails = (id) => requestJson(`/api/exams/${id}`);
export const listQuestions = () => requestJson('/api/exams/questions');

export const createExam = (payload) => requestJson('/api/exams', {
    method: 'POST',
    body: JSON.stringify(payload)
});

export const updateExam = (id, payload) => requestJson(`/api/exams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
});
