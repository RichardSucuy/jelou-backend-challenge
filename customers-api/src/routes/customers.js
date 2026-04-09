const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');
const ctrl = require('../controllers/customers.controller');

router.use(authenticateJWT);

router.post('/', ctrl.create);
router.get('/', ctrl.search);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;