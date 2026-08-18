import { users } from './users.mock.js';
import { classes } from './classes.mock.js';
import { questions } from './questions.mock.js';
import { exams } from './exams.mock.js';
import { applications } from './applications.mock.js';
import { examVersions } from './examVersions.mock.js';
import { examAssignments } from './examAssignments.mock.js';
import { corrections } from './corrections.mock.js';

export const getUserById = (id) => users.find((user) => user.id === id);

export const getClassById = (id) => classes.find((classItem) => classItem.id === id);

export const getStudentsByClassId = (classId) => {
    const classItem = getClassById(classId);

    if (!classItem) {
        return [];
    }

    return classItem.studentIds
        .map((studentId) => getUserById(studentId))
        .filter((student) => student?.role === 'estudante');
};

export const getQuestionById = (id) => questions.find((question) => question.id === id);

export const getExamById = (id) => exams.find((exam) => exam.id === id);

export const getExamQuestions = (examId) => {
    const exam = getExamById(examId);

    if (!exam) {
        return [];
    }

    return exam.questions
        .map(({ questionId, order, score }) => {
            const question = getQuestionById(questionId);
            return question ? { ...question, order, score } : null;
        })
        .filter(Boolean);
};

export const getApplicationById = (id) => (
    applications.find((application) => application.id === id)
);

export const getApplicationsByExamId = (examId) => (
    applications.filter((application) => application.examId === examId)
);

export const getApplicationsByClassId = (classId) => (
    applications.filter((application) => application.classId === classId)
);

export const getVersionsByApplicationId = (applicationId) => (
    examVersions.filter((version) => version.applicationId === applicationId)
);

export const getAssignmentsByVersionId = (versionId) => (
    examAssignments.filter((assignment) => assignment.examVersionId === versionId)
);

export const getCorrectionsByApplicationId = (applicationId) => {
    const versionIds = new Set(
        getVersionsByApplicationId(applicationId).map((version) => version.id)
    );

    return corrections.filter((correction) => versionIds.has(correction.examVersionId));
};

export const getCorrectionByStudentId = (studentId, applicationId) => (
    getCorrectionsByApplicationId(applicationId)
        .find((correction) => correction.studentId === studentId)
);
