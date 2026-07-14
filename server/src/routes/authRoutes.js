const express = require('express');
const { startKakaoLogin, handleKakaoCallback } = require('../controllers/kakaoAuthController');
const { startGoogleLogin, handleGoogleCallback } = require('../controllers/googleAuthController');

const router = express.Router();

router.get('/kakao', startKakaoLogin);
router.get('/kakao/callback', handleKakaoCallback);
router.get('/google', startGoogleLogin);
router.get('/google/callback', handleGoogleCallback);

module.exports = router;
