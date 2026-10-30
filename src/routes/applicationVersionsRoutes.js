
const { Router } = require('express');
const controller = require('../controllers/applicationVersionsController');
const teacherContext = require('../middlewares/teacherContext');
const { handleApiError } = require('../http/ApiError');

const router = Router();

router.use(teacherContext);

router.post(
    '/applications/:applicationId/generate',
    controller.generate
);

router.get(
    '/applications/:applicationId',
    controller.list
);

router.get(
    '/applications/:applicationId/assignments',
    controller.listAssignments
);

router.get('/:versionId/answer-key', controller.getAnswerKey);

router.use(handleApiError);

module.exports = router;
