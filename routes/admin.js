const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

// Проверка админа
const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

router.get('/users', auth, adminOnly, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.get('/deals', auth, adminOnly, async (req, res) => {
  const deals = await Deal.find().populate('buyer seller product');
  res.json(deals);
});

router.get('/products', auth, adminOnly, async (req, res) => {
  const products = await Product.find().populate('seller');
  res.json(products);
});

// Принудительный возврат денег (админ)
router.post('/deal/:dealId/refund', auth, adminOnly, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.dealId).populate('buyer');
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    if (deal.status !== 'pending') return res.status(400).json({ error: 'Deal already finalized' });

    // Возврат покупателю
    await User.findByIdAndUpdate(deal.buyer._id, { $inc: { balance: deal.amount } });

    deal.status = 'refunded';
    await deal.save();

    // Обновляем транзакцию
    await Transaction.findOneAndUpdate(
      { deal: deal._id },
      { status: 'failed' }
    );

    // Возвращаем товар в активные
    await Product.findByIdAndUpdate(deal.product, { status: 'active' });

    res.json({ deal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Принудительное завершение сделки (админ)
router.post('/deal/:dealId/complete', auth, adminOnly, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.dealId).populate('seller');
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    if (deal.status !== 'pending') return res.status(400).json({ error: 'Deal already finalized' });

    // Переводим деньги продавцу
    await User.findByIdAndUpdate(deal.seller._id, { $inc: { balance: deal.amount } });

    deal.status = 'completed';
    await deal.save();

    // Обновляем транзакцию
    await Transaction.findOneAndUpdate(
      { deal: deal._id },
      { status: 'completed' }
    );

    res.json({ deal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
