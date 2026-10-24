
const reportsRepository = require('../repositories/reportsRepository');

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
    const rows = await reportsRepository.getReportData(teacherId, filters);
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
    const [classes, applications] = await Promise.all([
        reportsRepository.listReportClasses(teacherId),
        reportsRepository.listReportApplications(teacherId, classId)
    ]);

    return { classes, applications };
}

module.exports = {
    getReport,
    getReportFilters
};
