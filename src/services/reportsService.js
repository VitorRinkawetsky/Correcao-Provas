
const reportsRepository = require('../repositories/reportsRepository');
const { ApiError } = require('../http/ApiError');

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function positiveId(value, field) {
    if (value === null || value === undefined) return null;
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Identificador invalido', [{ field }]);
    }
    return Number(value);
}

function validDate(value, field) {
    if (value === null || value === undefined) return null;

    const match = typeof value === 'string' ? DATE_PATTERN.exec(value) : null;
    const [, year, month, day] = match || [];
    const date = match ? new Date(`${year}-${month}-${day}T00:00:00Z`) : null;
    const isValid = date
        && !Number.isNaN(date.getTime())
        && date.getUTCFullYear() === Number(year)
        && date.getUTCMonth() + 1 === Number(month)
        && date.getUTCDate() === Number(day);

    if (!isValid) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Data invalida, use o formato AAAA-MM-DD', [{ field }]);
    }
    return value;
}

function validateFilters(filters) {
    const classId = positiveId(filters.classId, 'classId');
    const applicationId = positiveId(filters.applicationId, 'applicationId');
    const startDate = validDate(filters.startDate, 'startDate');
    const endDate = validDate(filters.endDate, 'endDate');

    if (startDate && endDate && startDate > endDate) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'A data inicial nao pode ser posterior a data final', [
            { field: 'startDate' }
        ]);
    }

    return { classId, applicationId, startDate, endDate };
}

function calculateMedian(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

async function getReport(teacherId, filters = {}) {
    const rows = await reportsRepository.getReportData(teacherId, validateFilters(filters));
    const scores = rows.map(row => Number(row.score));

    const total = scores.reduce((sum, score) => sum + score, 0);

    const distribution = [
        { range: '0–2', min: 0, max: 2, count: 0 },
        { range: '2–4', min: 2, max: 4, count: 0 },
        { range: '4–6', min: 4, max: 6, count: 0 },
        { range: '6–8', min: 6, max: 8, count: 0 },
        { range: '8–10', min: 8, max: 10, count: 0 }
    ];

    for (const score of scores) {
        const bucket = distribution.find((item, index) => {
            if (index === distribution.length - 1) {
                return score >= item.min && score <= item.max;
            }

            return score >= item.min && score < item.max;
        });

        if (bucket) {
            bucket.count++;
        }
    }

    return {
        summary: {
            totalCorrections: scores.length,
            average: scores.length
                ? Number((total / scores.length).toFixed(2))
                : 0,
            median: Number(calculateMedian(scores).toFixed(2)),
            highestScore: scores.length ? Math.max(...scores) : 0,
            lowestScore: scores.length ? Math.min(...scores) : 0
        },

        distribution,

        students: rows.map(row => ({
            correctionId: row.correctionId,
            studentId: row.studentId,
            studentName: row.studentName,
            registration: row.registration,
            score: Number(row.score),
            confirmedAt: row.confirmedAt,
            applicationId: row.applicationId,
            examTitle: row.examTitle,
            classId: row.classId,
            className: row.className
        }))
    };
}

async function getReportFilters(teacherId, classId = null) {
    const validClassId = positiveId(classId, 'classId');
    const [classes, applications] = await Promise.all([
        reportsRepository.listReportClasses(teacherId),
        reportsRepository.listReportApplications(teacherId, validClassId)
    ]);

    return { classes, applications };
}

module.exports = {
    getReport,
    getReportFilters,
    validateFilters
};
