import { getExamDetails } from './mocks/mockHelpers.js';

export function loadExamDetails(id) {
    return getExamDetails(Number(id));
}
