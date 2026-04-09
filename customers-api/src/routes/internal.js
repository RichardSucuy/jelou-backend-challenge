const router = require('express').Router();
const { authenticateServiceToken } = require('../middlewares/auth');
const { getById } = require('../controllers/customers.controller');

router.get('/:id', authenticateServiceToken, getById);

module.exports = router;