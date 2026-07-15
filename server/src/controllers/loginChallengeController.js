const {
  getLoginChallengeStatus,
  approveLoginChallenge,
  denyLoginChallenge,
  completeLoginChallenge,
} = require('../services/loginChallengeService');

const getChallenge = async (req, res, next) => {
  try {
    const status = await getLoginChallengeStatus(req.params.challengeId);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

const approveChallenge = async (req, res, next) => {
  try {
    await approveLoginChallenge(req.params.challengeId);
    res.json({ message: '로그인이 승인되었습니다.' });
  } catch (error) {
    next(error);
  }
};

const denyChallenge = async (req, res, next) => {
  try {
    await denyLoginChallenge(req.params.challengeId);
    res.json({ message: '로그인이 거절되었습니다.' });
  } catch (error) {
    next(error);
  }
};

const completeChallenge = async (req, res, next) => {
  try {
    const result = await completeLoginChallenge(req.params.challengeId);
    res.json({
      message: '로그인 성공',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChallenge,
  approveChallenge,
  denyChallenge,
  completeChallenge,
};
