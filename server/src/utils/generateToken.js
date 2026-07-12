const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      userType: user.userType,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  );
};

module.exports = generateToken;
