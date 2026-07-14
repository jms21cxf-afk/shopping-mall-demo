const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const omitPassword = (user) => {
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const checkUsername = async (req, res, next) => {
  try {
    const username = req.query.username?.trim().toLowerCase();

    if (!username) {
      return res.status(400).json({ message: 'username is required' });
    }

    const existingUser = await User.findOne({ username });

    res.json({
      username,
      available: !existingUser,
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'username and password are required',
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = generateToken(user);

    res.json({
      message: '로그인 성공',
      token,
      user: omitPassword(user),
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, username, name, password, userType, address, phone } = req.body;

    if (!email || !username || !name || !password) {
      return res.status(400).json({
        message: 'email, username, name, and password are required',
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const existingUsername = await User.findOne({ username: normalizedUsername });

    if (existingUsername) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.trim().toLowerCase(),
      username: normalizedUsername,
      name: name.trim(),
      password: hashedPassword,
      userType: userType || 'customer',
      address,
      phone,
    });

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: omitPassword(user),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const { email, username, name, password, userType, address, phone } = req.body;
    const updateData = {};

    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username.trim().toLowerCase();
    if (name !== undefined) updateData.name = name;
    if (userType !== undefined) updateData.userType = userType;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    if (username) {
      const existingUsername = await User.findOne({
        username: updateData.username,
        _id: { $ne: req.params.id },
      });

      if (existingUsername) {
        return res.status(409).json({ message: 'Username already exists' });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    next(error);
  }
};

const getCurrentUser = async (req, res) => {
  res.json(omitPassword(req.user));
};

const deleteUser = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  getCurrentUser,
  checkUsername,
  loginUser,
  createUser,
  updateUser,
  deleteUser,
};
