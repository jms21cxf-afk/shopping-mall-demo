const express = require('express');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
} = require('../controllers/orderController');

const router = express.Router();

router.use(protect);

router.get('/admin/all', requireAdmin, getAllOrdersAdmin);
router.patch('/admin/:id/status', requireAdmin, updateOrderStatusAdmin);
router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);

module.exports = router;
