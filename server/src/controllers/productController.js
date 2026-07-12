const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { PRODUCT_CATEGORIES } = require('../models/Product');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeSku = (sku) => sku?.trim().toUpperCase();

const getProducts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = req.query.limit ? Math.max(1, Number.parseInt(req.query.limit, 10)) : null;

    if (limit) {
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Product.countDocuments(filter),
      ]);

      return res.json({
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const checkSku = async (req, res, next) => {
  try {
    const sku = normalizeSku(req.query.sku);

    if (!sku) {
      return res.status(400).json({ message: 'sku is required' });
    }

    const existingProduct = await Product.findOne({ sku });

    res.json({
      sku,
      available: !existingProduct,
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { sku, name, price, category, image, description } = req.body;
    const normalizedSku = normalizeSku(sku);

    if (!normalizedSku || !name || price === undefined || !category || !image) {
      return res.status(400).json({
        message: 'sku, name, price, category, and image are required',
      });
    }

    if (!PRODUCT_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'price must be a number greater than or equal to 0' });
    }

    const existingProduct = await Product.findOne({ sku: normalizedSku });

    if (existingProduct) {
      return res.status(409).json({ message: 'SKU already exists' });
    }

    const product = await Product.create({
      sku: normalizedSku,
      name: name.trim(),
      price,
      category,
      image: image.trim(),
      description: description?.trim(),
    });

    res.status(201).json({
      message: '상품이 등록되었습니다.',
      product,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'SKU already exists' });
    }

    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const { sku, name, price, category, image, description } = req.body;
    const updateData = {};

    if (sku !== undefined) updateData.sku = normalizeSku(sku);
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (image !== undefined) updateData.image = image.trim();
    if (description !== undefined) updateData.description = description.trim();

    if (category !== undefined && !PRODUCT_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
      });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ message: 'price must be a number greater than or equal to 0' });
    }

    if (updateData.sku) {
      const existingProduct = await Product.findOne({
        sku: updateData.sku,
        _id: { $ne: req.params.id },
      });

      if (existingProduct) {
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'SKU already exists' });
    }

    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 주문 수량 기준 베스트셀러 상품 (주문 없으면 최신 상품으로 채움)
const getBestSellers = async (req, res, next) => {
  try {
    const limit = Math.min(10, Math.max(1, Number.parseInt(req.query.limit, 10) || 3));

    const orders = await Order.find({ status: { $nin: ['cancelled'] } }).select('items').lean();
    const salesByProduct = new Map();

    for (const order of orders) {
      for (const item of order.items) {
        const productId = String(item.product);
        salesByProduct.set(productId, (salesByProduct.get(productId) || 0) + item.quantity);
      }
    }

    const rankedIds = [...salesByProduct.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([productId]) => productId);

    let products = [];

    if (rankedIds.length > 0) {
      const fetchedProducts = await Product.find({ _id: { $in: rankedIds } });
      const productMap = new Map(fetchedProducts.map((product) => [String(product._id), product]));
      products = rankedIds.map((productId) => productMap.get(productId)).filter(Boolean);
    }

    if (products.length < limit) {
      const existingIds = products.map((product) => product._id);
      const fillerProducts = await Product.find({ _id: { $nin: existingIds } })
        .sort({ createdAt: -1 })
        .limit(limit - products.length);

      products = [...products, ...fillerProducts];
    }

    res.json(products);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getBestSellers,
  checkSku,
  createProduct,
  updateProduct,
  deleteProduct,
};
