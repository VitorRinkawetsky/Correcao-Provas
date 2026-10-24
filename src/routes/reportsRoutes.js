
const express = require('express');
const teacherContext = require('../middlewares/teacherContext');
const reportsController = require('../controllers/reportsController');

const router = express.Router();

router.use(teacherContext);

router.get('/filters', reportsController.getReportFilters);
router.get('/', reportsController.getReport);

module.exports = router;
