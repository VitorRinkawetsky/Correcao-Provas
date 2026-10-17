const { Router } = require('express');
const controller = require('../controllers/examsController');
const teacherContext = require('../middlewares/teacherContext');
const { handleApiError } = require('../http/ApiError');

const router = Router();

router.use(teacherContext);
router.get('/questions', controller.questions);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.details);
router.put('/:id', controller.update);
router.delete('/:id', controller.archive);
router.use(handleApiError);

module.exports = router;
