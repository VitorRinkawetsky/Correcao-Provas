const { Router } = require('express');
const controller = require('../controllers/correctionsController');
const teacherContext = require('../middlewares/teacherContext');
const { handleApiError } = require('../http/ApiError');

const router = Router();

router.use(teacherContext);
router.get('/context', controller.context);
router.post('/', controller.create);
router.get('/:id', controller.details);
router.put('/:id', controller.update);
router.use(handleApiError);

module.exports = router;
