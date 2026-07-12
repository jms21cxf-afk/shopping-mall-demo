const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// product 정보를 함께 채워서 클라이언트에 반환
const populateCart = (cart) =>
  cart.populate({
    path: 'items.product',
    select: 'sku name price category image description',
  });

// 사용자 장바구니 문서를 조회하고, 없으면 빈 장바구니를 새로 만듭니다.
const getCartDoc = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

const getProductId = (item) =>
  item.product._id ? item.product._id.toString() : item.product.toString();

const getCart = async (req, res, next) => {
  try {
    const cart = await populateCart(await getCartDoc(req.user._id));
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

const addCartItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty < 1) {
      return res.status(400).json({ message: 'quantity must be at least 1' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const cart = await getCartDoc(req.user._id);
    const existingItem = cart.items.find((item) => getProductId(item) === productId);

    // 이미 담긴 상품이면 수량만 증가, 없으면 새 항목 추가
    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.items.push({ product: productId, quantity: qty });
    }

    await cart.save();
    const populatedCart = await populateCart(cart);

    res.status(201).json({
      message: '상품이 장바구니에 담겼습니다.',
      cart: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.itemId)) {
      return res.status(400).json({ message: 'Invalid cart item id' });
    }

    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ message: 'quantity is required' });
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty < 1) {
      return res.status(400).json({ message: 'quantity must be at least 1' });
    }

    const cart = await getCartDoc(req.user._id);
    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    item.quantity = qty;
    await cart.save();

    res.json(await populateCart(cart));
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.itemId)) {
      return res.status(400).json({ message: 'Invalid cart item id' });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cart.items.pull(req.params.itemId);
    await cart.save();

    res.json({
      message: 'Cart item removed successfully',
      cart: await populateCart(cart),
    });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.json({
        message: 'Cart is already empty',
        cart: { user: req.user._id, items: [] },
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      message: 'Cart cleared successfully',
      cart: await populateCart(cart),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
