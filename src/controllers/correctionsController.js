const defaultService = require('../services/correctionsService');

function success(response, data, status = 200) {
    return response.status(status).json({
        data,
        meta: Array.isArray(data) ? { total: data.length } : {}
    });
}

function createCorrectionsController(service = defaultService) {
    return {
        context: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.getContext(request.query.code, request.teacher.id)
                );
            } catch (error) {
                return next(error);
            }
        },

        create: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.correct(request.teacher.id, request.body),
                    201
                );
            } catch (error) {
                return next(error);
            }
        },

        details: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.getCorrection(request.params.id, request.teacher.id)
                );
            } catch (error) {
                return next(error);
            }
        },

        update: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.update(
                        request.params.id,
                        request.teacher.id,
                        request.body
                    )
                );
            } catch (error) {
                return next(error);
            }
        },

        listCorrections: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.listCorrections(request.teacher.id, {
                        applicationId: request.query.applicationId,
                        search: request.query.search
                    })
                );
            } catch (error) {
                return next(error);
            }
        },

        getFormOptions: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.getFormOptions(
                        request.teacher.id,
                        request.params.applicationId
                    )
                );
            } catch (error) {
                return next(error);
            }
        },

        getVersionQuestions: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.getVersionQuestions(
                        request.teacher.id,
                        request.params.versionId
                    )
                );
            } catch (error) {
                return next(error);
            }
        },

        createCorrection: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.createCorrection(request.teacher.id, request.body),
                    201
                );
            } catch (error) {
                return next(error);
            }
        },

        listPending: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.listPending(
                        request.teacher.id,
                        request.params.applicationId
                    )
                );
            } catch (error) {
                return next(error);
            }
        },

        listStudents: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.listStudents(
                        request.teacher.id,
                        request.params.applicationId
                    )
                );
            } catch (error) {
                return next(error);
            }
        },

        associateStudent: async (request, response, next) => {
            try {
                return success(
                    response,
                    await service.associateStudent(
                        request.teacher.id,
                        request.params.correctionId,
                        request.body
                    )
                );
            } catch (error) {
                return next(error);
            }
        }
    };
}

const controller = createCorrectionsController();

module.exports = { ...controller, createCorrectionsController };
