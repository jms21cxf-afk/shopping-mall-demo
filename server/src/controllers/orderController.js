const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { PAYMENT_METHODS } = require('../models/Order');
const { verifyPortOnePayment } = require('../services/portoneService');

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const generateOrderNumber = async () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${datePart}-`;
  const count = await Order.countDocuments({
    orderNumber: new RegExp(`^${prefix}`),
  });

  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const calculateShippingFee = (itemsTotal) =>
  itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

const buildOrderItems = (cartItems) =>
  cartItems.map((item) => {
    const product = item.product;

    return {
      product: product._id,
      sku: product.sku,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
    };
  });

const validateShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return 'shippingAddress is required';
  }

  const { recipientName, phone, address1 } = shippingAddress;

  if (!recipientName?.trim()) {
    return '받는 사람 이름을 입력해 주세요.';
  }

  if (!phone?.trim()) {
    return '연락처를 입력해 주세요.';
  }

  if (!address1?.trim()) {
    return '배송 주소를 입력해 주세요.';
  }

  return null;
};

// paymentId로 이미 생성된 주문이 있는지 확인 (중복 주문 방지)
const findOrderByPaymentId = async (paymentId) => {
  if (!paymentId?.trim()) return null;

  return Order.findOne({ 'payment.transactionId': paymentId.trim() });
};

const createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod = 'card', paymentId } = req.body;
    const normalizedPaymentId = paymentId?.trim();

    const addressError = validateShippingAddress(shippingAddress);
    if (addressError) {
      return res.status(400).json({ message: addressError });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (paymentMethod === 'card' && !normalizedPaymentId) {
      return res.status(400).json({ message: 'paymentId is required for card payment' });
    }

    // 동일 paymentId로 이미 주문이 있으면 중복 생성하지 않음
    if (normalizedPaymentId) {
      const existingOrder = await findOrderByPaymentId(normalizedPaymentId);

      if (existingOrder) {
        if (existingOrder.user.toString() === req.user._id.toString()) {
          return res.json({
            message: '이미 처리된 주문입니다.',
            order: existingOrder,
            duplicate: true,
          });
        }

        return res.status(409).json({ message: '이미 사용된 결제 정보입니다.' });
      }
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'sku name price image',
    });

    if (!cart?.items?.length) {
      return res.status(400).json({ message: '장바구니가 비어 있습니다.' });
    }

    const missingProduct = cart.items.find((item) => !item.product);
    if (missingProduct) {
      return res.status(400).json({ message: '장바구니에 존재하지 않는 상품이 있습니다.' });
    }

    const orderItems = buildOrderItems(cart.items);
    const itemsTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingFee = calculateShippingFee(itemsTotal);
    const discountAmount = 0;
    const totalAmount = itemsTotal + shippingFee - discountAmount;

    // 포트원 API로 결제 상태·금액 검증
    if (paymentMethod === 'card') {
      try {
        await verifyPortOnePayment(normalizedPaymentId, totalAmount);
      } catch (verifyError) {
        const status = verifyError.status || 400;
        return res.status(status).json({
          message: verifyError.message || '결제 검증에 실패했습니다.',
        });
      }
    }

    const orderNumber = await generateOrderNumber();
    const now = new Date();

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      itemsTotal,
      shippingFee,
      discountAmount,
      totalAmount,
      shippingAddress: {
        recipientName: shippingAddress.recipientName.trim(),
        phone: shippingAddress.phone.trim(),
        postalCode: shippingAddress.postalCode?.trim() || '',
        address1: shippingAddress.address1.trim(),
        address2: shippingAddress.address2?.trim() || '',
        deliveryMemo: shippingAddress.deliveryMemo?.trim() || '',
      },
      status: 'paid',
      paidAt: now,
      payment: {
        method: paymentMethod,
        status: 'paid',
        transactionId: normalizedPaymentId || `DEMO-${Date.now()}`,
      },
    });

    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: '주문이 완료되었습니다.',
      order,
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.['payment.transactionId']) {
      const existingOrder = await findOrderByPaymentId(req.body.paymentId?.trim());
      if (existingOrder && existingOrder.user.toString() === req.user._id.toString()) {
        return res.json({
          message: '이미 처리된 주문입니다.',
          order: existingOrder,
          duplicate: true,
        });
      }
      return res.status(409).json({ message: '이미 사용된 결제 정보입니다.' });
    }

    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const isAdmin = req.user.userType === 'admin';
    const query = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };

    const order = await Order.findOne(query).select('-__v');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// 관리자용 전체 주문 목록 (고객 정보 포함)
const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone')
      .select('-__v');

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// 관리자용 주문 상태 변경 (배송 시작, 주문 취소 등)
const updateOrderStatusAdmin = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const { status } = req.body;
    const allowedStatuses = [
      'pending',
      'paid',
      'preparing',
      'shipping_started',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status === 'cancelled' && ['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: '취소할 수 없는 주문 상태입니다.' });
    }

    order.status = status;

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email phone')
      .select('-__v');

    res.json({
      message: '주문 상태가 변경되었습니다.',
      order: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
};
