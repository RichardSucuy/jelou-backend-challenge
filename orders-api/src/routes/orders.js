const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');
const idempotency = require('../middlewares/idempotency');
const ctrl = require('../controllers/orders.controller');

router.use(authenticateJWT);

router.post('/', ctrl.create);
router.get('/', ctrl.search);
router.get('/:id', ctrl.getById);
router.post('/:id/confirm', idempotency('order_confirm'), ctrl.confirm);
router.post('/:id/cancel', ctrl.cancel);

module.exports = router;