const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Transaction = require('../models/Transaction');

// Получить профиль текущего пользователя
router.get('/profile', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json(user);
});

// Получить историю сделок (покупки и продажи)
router.get('/deals', auth, async (req, res) => {
  const deals = await Deal.find({
    $or: [{ buyer: req.userId }, { seller: req.userId }]
  }).populate('product buyer seller');
  res.json(deals);
});

// Получить историю транзакций (пополнения/выводы)
router.get('/transactions', auth, async (req, res) => {
  const transactions = await Transaction.find({ user: req.userId });
  res.json(transactions);
});

module.exports = router;
