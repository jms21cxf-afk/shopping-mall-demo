const crypto = require('crypto');
const LoginChallenge = require('../models/LoginChallenge');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { getRequestMeta } = require('../utils/requestMeta');
const { lookupGeoFromRequest } = require('../utils/geoLookup');

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function omitPassword(user) {
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
}

function formatLocation(location = {}) {
  const parts = [location.city, location.country].filter(Boolean);
  return parts.join(', ') || 'Unknown location';
}

async function markExpiredIfNeeded(challenge) {
  if (challenge.status === 'pending' && challenge.expiresAt <= new Date()) {
    challenge.status = 'expired';
    await challenge.save();
  }

  return challenge;
}

async function createLoginChallenge(user, req) {
  const { ip, deviceLabel } = getRequestMeta(req);
  let location = { country: '', countryCode: '', city: '' };

  try {
    location = await lookupGeoFromRequest(req);
  } catch {
    // Location is optional for login verification.
  }

  const challengeId = crypto.randomUUID();

  await LoginChallenge.create({
    challengeId,
    userId: user._id,
    status: 'pending',
    deviceLabel,
    ipAddress: ip,
    location: {
      country: location.country || '',
      countryCode: location.countryCode || '',
      city: location.city || '',
    },
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  return challengeId;
}

async function getLoginChallenge(challengeId) {
  const challenge = await LoginChallenge.findOne({ challengeId });

  if (!challenge) {
    const error = new Error('로그인 확인 요청을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  await markExpiredIfNeeded(challenge);

  const user = await User.findById(challenge.userId).select('-password');

  if (!user) {
    const error = new Error('사용자 정보를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  return {
    challenge,
    user,
  };
}

async function getLoginChallengeStatus(challengeId) {
  const { challenge, user } = await getLoginChallenge(challengeId);

  return {
    challengeId: challenge.challengeId,
    status: challenge.status,
    deviceLabel: challenge.deviceLabel,
    locationLabel: formatLocation(challenge.location),
    location: challenge.location,
    userName: user.name,
    expiresAt: challenge.expiresAt,
  };
}

async function approveLoginChallenge(challengeId) {
  const { challenge } = await getLoginChallenge(challengeId);

  if (challenge.status === 'expired') {
    const error = new Error('로그인 확인 요청이 만료되었습니다.');
    error.status = 410;
    throw error;
  }

  if (challenge.status === 'denied') {
    const error = new Error('이미 거절된 로그인 요청입니다.');
    error.status = 409;
    throw error;
  }

  if (challenge.status === 'approved') {
    return challenge;
  }

  challenge.status = 'approved';
  await challenge.save();
  return challenge;
}

async function denyLoginChallenge(challengeId) {
  const { challenge } = await getLoginChallenge(challengeId);

  if (challenge.status === 'expired') {
    const error = new Error('로그인 확인 요청이 만료되었습니다.');
    error.status = 410;
    throw error;
  }

  if (challenge.status === 'approved') {
    const error = new Error('이미 승인된 로그인 요청입니다.');
    error.status = 409;
    throw error;
  }

  challenge.status = 'denied';
  await challenge.save();
  return challenge;
}

async function completeLoginChallenge(challengeId) {
  const { challenge, user } = await getLoginChallenge(challengeId);

  if (challenge.status === 'expired') {
    const error = new Error('로그인 확인 요청이 만료되었습니다. 다시 로그인해 주세요.');
    error.status = 410;
    throw error;
  }

  if (challenge.status === 'denied') {
    const error = new Error('로그인이 거절되었습니다.');
    error.status = 403;
    throw error;
  }

  if (challenge.status !== 'approved') {
    const error = new Error('휴대폰에서 로그인 승인을 기다리는 중입니다.');
    error.status = 409;
    throw error;
  }

  const token = generateToken(user);

  return {
    token,
    user: omitPassword(user),
  };
}

module.exports = {
  createLoginChallenge,
  getLoginChallengeStatus,
  approveLoginChallenge,
  denyLoginChallenge,
  completeLoginChallenge,
};
