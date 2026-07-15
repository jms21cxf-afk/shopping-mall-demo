const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createLoginChallenge } = require('../services/loginChallengeService');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI must be set in server/.env');
  }

  return { clientId, clientSecret, redirectUri, clientUrl };
}

function redirectWithError(res, clientUrl, message) {
  const params = new URLSearchParams({ error: message });
  res.redirect(`${clientUrl}/auth/google/callback?${params}`);
}

const startGoogleLogin = (req, res) => {
  try {
    const { clientId, redirectUri } = getGoogleConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'login',
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleGoogleCallback = async (req, res) => {
  let clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const config = getGoogleConfig();
    clientUrl = config.clientUrl;
    const { code, error, error_description: errorDescription } = req.query;

    if (error) {
      return redirectWithError(res, clientUrl, errorDescription || error);
    }

    if (!code) {
      return redirectWithError(res, clientUrl, '구글 인증 코드가 없습니다.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    });

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const message = tokenData.error_description || tokenData.error || '구글 토큰 발급에 실패했습니다.';
      return redirectWithError(res, clientUrl, message);
    }

    const profileResponse = await fetch(GOOGLE_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await profileResponse.json();

    if (!profileResponse.ok) {
      const message = googleUser.error?.message || '구글 사용자 정보를 불러오지 못했습니다.';
      return redirectWithError(res, clientUrl, message);
    }

    const googleId = String(googleUser.id);
    const name = googleUser.name?.trim() || '구글 사용자';
    const email = googleUser.email?.trim().toLowerCase() || `google_${googleId}@google.local`;
    const username = `google_${googleId}`;

    let user = await User.findOne({ googleId });

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
        googleId,
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
    res.redirect(`${clientUrl}/auth/google/callback?${params}`);
  } catch (callbackError) {
    redirectWithError(res, clientUrl, callbackError.message || '구글 로그인에 실패했습니다.');
  }
};

module.exports = {
  startGoogleLogin,
  handleGoogleCallback,
};
