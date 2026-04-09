const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');
const ctrl = require('../controllers/products.controller');

router.use(authenticateJWT);

router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.get('/:id', ctrl.getById);
router.get('/', ctrl.search);

module.exports = router;