
const reportsService = require('../services/reportsService');

async function getReport(request, response, next) {
    try {
        const filters = {
            classId: request.query.classId || null,
            applicationId: request.query.applicationId || null,
            startDate: request.query.startDate || null,
            endDate: request.query.endDate || null
        };

        response.json({
            status: 'ok',
            data: await reportsService.getReport(
                request.teacher.id,
                filters
            )
        });
    } catch (error) {
        next(error);
    }
}

async function getReportFilters(request, response, next) {
    try {
        const classId = request.query.classId || null;

        response.json({
            status: 'ok',
            data: await reportsService.getReportFilters(
                request.teacher.id,
                classId
            )
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getReport,
    getReportFilters
};
