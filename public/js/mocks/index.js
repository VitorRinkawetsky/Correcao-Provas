export { users } from './users.mock.js';
export { classes } from './classes.mock.js';
export { questions } from './questions.mock.js';
export { exams } from './exams.mock.js';
export { applications } from './applications.mock.js';
export { examVersions } from './examVersions.mock.js';
export { examAssignments } from './examAssignments.mock.js';
export { corrections } from './corrections.mock.js';

export {
    getUserById,
    getClassById,
    getStudentsByClassId,
    getQuestionById,
    getExamById,
    getExamQuestions,
    getExamDetails,
    getApplicationById,
    getApplicationsByExamId,
    getApplicationsByClassId,
    getVersionsByApplicationId,
    getAssignmentsByVersionId,
    getCorrectionsByApplicationId,
    getCorrectionByStudentId
} from './mockHelpers.js';
