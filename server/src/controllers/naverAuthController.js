const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createLoginChallenge } = require('../services/loginChallengeService');

const NAVER_AUTH_URL = 'https://nid.naver.com/oauth2.0/authorize';
const NAVER_TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const NAVER_USER_URL = 'https://openapi.naver.com/v1/nid/me';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const oauthStates = new Map();

function getNaverConfig() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const redirectUri = process.env.NAVER_REDIRECT_URI;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_REDIRECT_URI must be set in server/.env');
  }

  return { clientId, clientSecret, redirectUri, clientUrl };
}

function redirectWithError(res, clientUrl, message) {
  const params = new URLSearchParams({ error: message });
  res.redirect(`${clientUrl}/auth/naver/callback?${params}`);
}

function createOAuthState() {
  const state = crypto.randomUUID();
  oauthStates.set(state, Date.now());
  return state;
}

function consumeOAuthState(state) {
  if (!state || !oauthStates.has(state)) {
    return false;
  }

  const createdAt = oauthStates.get(state);
  oauthStates.delete(state);

  return Date.now() - createdAt <= OAUTH_STATE_TTL_MS;
}

const startNaverLogin = (req, res) => {
  try {
    const { clientId, redirectUri } = getNaverConfig();
    const state = createOAuthState();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    res.redirect(`${NAVER_AUTH_URL}?${params}`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleNaverCallback = async (req, res) => {
  let clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const config = getNaverConfig();
    clientUrl = config.clientUrl;
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return redirectWithError(res, clientUrl, errorDescription || error);
    }

    if (!code) {
      return redirectWithError(res, clientUrl, '네이버 인증 코드가 없습니다.');
    }

    if (!consumeOAuthState(state)) {
      return redirectWithError(res, clientUrl, '네이버 로그인 state 값이 올바르지 않습니다.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      state,
    });

    const tokenResponse = await fetch(`${NAVER_TOKEN_URL}?${tokenParams.toString()}`);

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      const message = tokenData.error_description || tokenData.error || '네이버 토큰 발급에 실패했습니다.';
      return redirectWithError(res, clientUrl, message);
    }

    const profileResponse = await fetch(NAVER_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok || profileData.resultcode !== '00') {
      const message = profileData.message || '네이버 사용자 정보를 불러오지 못했습니다.';
      return redirectWithError(res, clientUrl, message);
    }

    const naverUser = profileData.response;
    const naverId = String(naverUser.id);
    const name = naverUser.name?.trim() || naverUser.nickname?.trim() || '네이버 사용자';
    const email = naverUser.email?.trim().toLowerCase() || `naver_${naverId}@naver.local`;
    const username = `naver_${naverId}`;

    let user = await User.findOne({ naverId });

    if (!user) {
      const existingEmailUser = await User.findOne({ email });

      if (existingEmailUser) {
        return redirectWithError(
          res,
          clientUrl,
          '이미 같은 이메일로 가입된 계정이 있습니다. 아이디/비밀번호로 로그인해 주세요.',
        );
      }

      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      user = await User.create({
        naverId,
        email,
        username,
        name,
        password: randomPassword,
        userType: 'customer',
      });
    } else if (user.name !== name) {
      user.name = name;
      await user.save();
    }

    const challengeId = await createLoginChallenge(user, req);
    const params = new URLSearchParams({ challenge: challengeId });
    res.redirect(`${clientUrl}/auth/naver/callback?${params}`);
  } catch (callbackError) {
    redirectWithError(res, clientUrl, callbackError.message || '네이버 로그인에 실패했습니다.');
  }
};

module.exports = {
  startNaverLogin,
  handleNaverCallback,
};
