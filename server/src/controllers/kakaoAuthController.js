const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createLoginChallenge } = require('../services/loginChallengeService');

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

function getKakaoConfig() {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!restApiKey || !redirectUri) {
    throw new Error('KAKAO_REST_API_KEY and KAKAO_REDIRECT_URI must be set in server/.env');
  }

  return { restApiKey, redirectUri, clientSecret, clientUrl };
}

function redirectWithError(res, clientUrl, message) {
  const params = new URLSearchParams({ error: message });
  res.redirect(`${clientUrl}/auth/kakao/callback?${params}`);
}

const startKakaoLogin = (req, res) => {
  try {
    const { restApiKey, redirectUri } = getKakaoConfig();
    const params = new URLSearchParams({
      client_id: restApiKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'profile_nickname',
    });

    res.redirect(`${KAKAO_AUTH_URL}?${params}`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleKakaoCallback = async (req, res) => {
  let clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const config = getKakaoConfig();
    clientUrl = config.clientUrl;
    const { code, error, error_description: errorDescription } = req.query;

    if (error) {
      return redirectWithError(res, clientUrl, errorDescription || error);
    }

    if (!code) {
      return redirectWithError(res, clientUrl, '카카오 인증 코드가 없습니다.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.restApiKey,
      redirect_uri: config.redirectUri,
      code,
    });

    if (config.clientSecret) {
      tokenParams.set('client_secret', config.clientSecret);
    }

    const tokenResponse = await fetch(KAKAO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const message = tokenData.error_description || tokenData.error || '카카오 토큰 발급에 실패했습니다.';
      return redirectWithError(res, clientUrl, message);
    }

    const profileResponse = await fetch(KAKAO_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const kakaoUser = await profileResponse.json();

    if (!profileResponse.ok) {
      const message = kakaoUser.msg || '카카오 사용자 정보를 불러오지 못했습니다.';
      return redirectWithError(res, clientUrl, message);
    }

    const kakaoId = String(kakaoUser.id);
    const email =
      kakaoUser.kakao_account?.email?.trim().toLowerCase() || `kakao_${kakaoId}@kakao.local`;
    const nickname =
      kakaoUser.kakao_account?.profile?.nickname ||
      kakaoUser.properties?.nickname ||
      kakaoUser.properties?.['property_nickname'] ||
      null;
    const displayName = nickname?.trim() || email.split('@')[0] || '카카오 사용자';
    const username = `kakao_${kakaoId}`;

    let user = await User.findOne({ kakaoId });

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
        kakaoId,
        email,
        username,
        name: displayName,
        password: randomPassword,
        userType: 'customer',
      });
    } else if (user.name !== displayName) {
      user.name = displayName;
      await user.save();
    }

    const challengeId = await createLoginChallenge(user, req);
    const params = new URLSearchParams({ challenge: challengeId });
    res.redirect(`${clientUrl}/auth/kakao/callback?${params}`);
  } catch (callbackError) {
    redirectWithError(res, clientUrl, callbackError.message || '카카오 로그인에 실패했습니다.');
  }
};

module.exports = {
  startKakaoLogin,
  handleKakaoCallback,
};
