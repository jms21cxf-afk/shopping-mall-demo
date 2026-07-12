const express = require('express');
const {
  getUsers,
  getUserById,
  checkUsername,
  loginUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/', getUsers);
router.get('/check-username', checkUsername);
router.post('/signup', createUser);
router.post('/login', loginUser);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
