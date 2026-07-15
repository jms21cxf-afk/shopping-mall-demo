const express = require('express');
const { startKakaoLogin, handleKakaoCallback } = require('../controllers/kakaoAuthController');
const { startGoogleLogin, handleGoogleCallback } = require('../controllers/googleAuthController');
const { startNaverLogin, handleNaverCallback } = require('../controllers/naverAuthController');
const {
  getChallenge,
  approveChallenge,
  denyChallenge,
  completeChallenge,
} = require('../controllers/loginChallengeController');

const router = express.Router();

router.get('/kakao', startKakaoLogin);
router.get('/kakao/callback', handleKakaoCallback);
router.get('/google', startGoogleLogin);
router.get('/google/callback', handleGoogleCallback);
router.get('/naver', startNaverLogin);
router.get('/naver/callback', handleNaverCallback);
router.get('/challenge/:challengeId', getChallenge);
router.post('/challenge/:challengeId/approve', approveChallenge);
router.post('/challenge/:challengeId/deny', denyChallenge);
router.post('/challenge/:challengeId/complete', completeChallenge);

module.exports = router;
