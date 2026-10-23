const { Router } = require('express');
const controller = require('../controllers/questionsController');
const teacherContext = require('../middlewares/teacherContext');
const { handleApiError } = require('../http/ApiError');

const router = Router();

router.use(teacherContext);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.use(handleApiError);

module.exports = router;