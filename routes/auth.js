const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// Проверка подписи данных от Telegram (WebApp initData)
function verifyTelegramWebAppData(initData) {
  // Реализация проверки (пропущена для краткости, но в реальном проекте нужна)
  // Возвращает объект данных пользователя, если подпись верна
  return JSON.parse(initData).user;
}

router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    // Проверяем подпись (в реальности используйте библиотеку или свою проверку)
    const userData = verifyTelegramWebAppData(initData);
    
    let user = await User.findOne({ telegramId: userData.id });
    if (!user) {
      user = new User({
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        photoUrl: userData.photo_url
      });
      await user.save();
    }

    // Генерируем JWT
    const token = jwt.sign(
      { id: user._id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
