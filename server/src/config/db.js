const dns = require('dns');
const mongoose = require('mongoose');

// 일부 Windows/ISP DNS 환경에서 mongodb+srv SRV 조회가 실패하는 경우가 있어 보조 DNS를 사용합니다.
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

module.exports = connectDB;
