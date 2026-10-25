
import { requestJson } from './apiClient';

export async function getReport(filters = {}) {
    const params = new URLSearchParams();

    if (filters.classId) params.set('classId', filters.classId);
    if (filters.applicationId) params.set('applicationId', filters.applicationId);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    const query = params.toString();
    return requestJson(`/api/reports${query ? `?${query}` : ''}`);
}

export async function getReportFilters(classId = '') {
    const params = new URLSearchParams();

    if (classId) params.set('classId', classId);

    const query = params.toString();

    return requestJson(
        `/api/reports/filters${query ? `?${query}` : ''}`
    );
}
