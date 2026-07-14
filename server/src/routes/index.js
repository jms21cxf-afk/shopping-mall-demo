const express = require('express');

const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const geoRoutes = require('./geoRoutes');

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/carts', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/geo', geoRoutes);

module.exports = router;
