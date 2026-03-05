const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const axios = require('axios');

// Создание счета на пополнение
router.post('/create-invoice', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount < 1) return res.status(400).json({ error: 'Minimum amount 1 USDT' });

    // Здесь реальный запрос к API Crypto Bot
    // Документация: https://help.crypt.bot/crypto-pay-api
    // Для примера создаём запись в БД и генерируем ссылку-заглушку
    const transaction = new Transaction({
      user: req.userId,
      type: 'deposit',
      amount,
      status: 'pending'
    });
    await transaction.save();

    // Имитация ответа от Crypto Bot
    const invoiceUrl = `https://t.me/CryptoBot?start=invoice_${transaction._id}`;

    res.json({ invoiceUrl, transactionId: transaction._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создание запроса на вывод
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, walletAddress } = req.body;
    const user = await User.findById(req.userId);
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // Блокируем средства (создаём транзакцию в статусе pending)
    user.balance -= amount;
    await user.save();

    const transaction = new Transaction({
      user: req.userId,
      type: 'withdraw',
      amount,
      status: 'pending'
    });
    await transaction.save();

    // Здесь реальный вызов API Crypto Bot для выплаты
    // После успеха обновим статус

    res.json({ transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook от Crypto Bot (для пополнений)
router.post('/webhook', async (req, res) => {
  // В реальности Crypto Bot присылает уведомление об оплате
  // Проверяем подпись и обновляем статус транзакции
  const { payload } = req.body; // пример
  // Ищем транзакцию по invoice_id
  const transaction = await Transaction.findById(payload.invoice_id);
  if (transaction && payload.status === 'paid') {
    transaction.status = 'completed';
    await transaction.save();
    // Начисляем баланс пользователю
    await User.findByIdAndUpdate(transaction.user, { $inc: { balance: transaction.amount } });
  }
  res.sendStatus(200);
});

module.exports = router;
