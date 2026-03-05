const router = require('express').Router();
const auth = require('../middleware/auth');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Покупка товара
router.post('/buy/:productId', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).populate('seller');
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    if (product.status !== 'active') return res.status(400).json({ error: 'Товар уже продан' });

    const buyer = await User.findById(req.userId);
    if (buyer.balance < product.price) return res.status(400).json({ error: 'Недостаточно средств' });
    if (buyer._id.equals(product.seller._id)) return res.status(400).json({ error: 'Нельзя купить свой товар' });

    // Замораживаем средства (списываем у покупателя, но не зачисляем продавцу)
    buyer.balance -= product.price;
    await buyer.save();

    // Создаём сделку
    const deal = new Deal({
      product: product._id,
      buyer: buyer._id,
      seller: product.seller._id,
      amount: product.price,
      status: 'pending'
    });
    await deal.save();

    // Меняем статус товара
    product.status = 'sold';
    await product.save();

    // Создаём транзакцию платежа
    const transaction = new Transaction({
      user: buyer._id,
      type: 'payment',
      amount: product.price,
      status: 'pending',
      deal: deal._id
    });
    await transaction.save();

    res.json({ deal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Подтверждение сделки (покупатель подтверждает получение)
router.post('/confirm/:dealId', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.dealId).populate('seller');
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    if (deal.buyer.toString() !== req.userId) return res.status(403).json({ error: 'Доступ запрещён' });
    if (deal.status !== 'pending') return res.status(400).json({ error: 'Сделка уже завершена' });

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

// Отмена сделки (покупатель инициирует возврат, может быть использовано как жалоба)
router.post('/cancel/:dealId', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.dealId).populate('buyer');
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    if (deal.buyer._id.toString() !== req.userId && req.userRole !== 'admin')
      return res.status(403).json({ error: 'Доступ запрещён' });

    if (deal.status !== 'pending') return res.status(400).json({ error: 'Сделку нельзя отменить' });

    // Возвращаем деньги покупателю
    await User.findByIdAndUpdate(deal.buyer._id, { $inc: { balance: deal.amount } });

    deal.status = 'cancelled';
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

module.exports = router;
