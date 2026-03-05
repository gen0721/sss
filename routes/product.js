const router = require('express').Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// Получить все активные товары
router.get('/', async (req, res) => {
  const products = await Product.find({ status: 'active' }).populate('seller', 'username');
  res.json(products);
});

// Поиск товаров по названию или категории
router.get('/search', async (req, res) => {
  const { q, category } = req.query;
  let filter = { status: 'active' };
  if (q) filter.title = { $regex: q, $options: 'i' };
  if (category) filter.category = category;
  const products = await Product.find(filter).populate('seller', 'username');
  res.json(products);
});

// Создать товар (только для авторизованных)
router.post('/', auth, async (req, res) => {
  const { title, description, price, category } = req.body;
  const product = new Product({
    title,
    description,
    price,
    category,
    seller: req.userId
  });
  await product.save();
  res.json(product);
});

// Получить товары текущего пользователя
router.get('/my', auth, async (req, res) => {
  const products = await Product.find({ seller: req.userId });
  res.json(products);
});

module.exports = router;
