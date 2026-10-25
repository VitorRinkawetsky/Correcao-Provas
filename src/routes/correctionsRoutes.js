const { Router } = require('express');
const defaultService = require('../services/correctionsService');
const { createCorrectionsController } = require('../controllers/correctionsController');
const teacherContext = require('../middlewares/teacherContext');
const { handleApiError } = require('../http/ApiError');

function createCorrectionsRouter({
    service = defaultService,
    context = teacherContext
} = {}) {
    const router = Router();
    const controller = createCorrectionsController(service);

    router.use(context);
    router.get('/', controller.listCorrections);
    router.post('/', controller.createCorrection);
    router.get('/applications/:applicationId/form-options', controller.getFormOptions);
    router.get('/applications/:applicationId/pending', controller.listPending);
    router.get('/applications/:applicationId/students', controller.listStudents);
    router.get('/versions/:versionId/questions', controller.getVersionQuestions);
    router.put('/:correctionId/student', controller.associateStudent);
    router.use(handleApiError);

    return router;
}

const router = createCorrectionsRouter();

module.exports = router;
module.exports.createCorrectionsRouter = createCorrectionsRouter;
