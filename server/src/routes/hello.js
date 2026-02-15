const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/hello', authMiddleware(), (req, res) => {
  const email = req.user?.email;
  const message = email ? `Hello, ${email}` : 'Hello, world';
  res.json({ message });
});

module.exports = router;
