const express = require('express');
const {
  getProducts,
  getProductById,
  getBestSellers,
  checkSku,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

router.get('/', getProducts);
router.get('/best-sellers', getBestSellers);
router.get('/check-sku', checkSku);
router.post('/', createProduct);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
