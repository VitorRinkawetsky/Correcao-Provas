
const { Router } = require('express');
const controller = require('../controllers/applicationsController');
const classTeacherContext = require('../middlewares/classTeacherContext');
const { handleApiError } = require('../http/ApiError');

const router = Router();

router.use(classTeacherContext);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);

module.exports = router;
