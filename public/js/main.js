document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  setupSearch();
  setupCategories();
});

async function loadProducts(category = 'all', searchQuery = '') {
  let url = '/api/products';
  if (searchQuery) {
    url = `/api/products/search?q=${encodeURIComponent(searchQuery)}`;
  } else if (category && category !== 'all') {
    url = `/api/products/search?category=${encodeURIComponent(category)}`;
  }
  try {
    const products = await apiCall(url);
    renderProducts(products);
  } catch (error) {
    console.error(error);
  }
}

function renderProducts(products) {
  const container = document.getElementById('product-list');
  if (!products.length) {
    container.innerHTML = '<p class="no-products">Товаров не найдено</p>';
    return;
  }
  container.innerHTML = products.map(p => `
    <div class="product-card" data-id="${p._id}">
      <h3>${p.title}</h3>
      <p>${p.description || 'Нет описания'}</p>
      <p class="price">${p.price} USDT</p>
      <p>Продавец: @${p.seller?.username || 'unknown'}</p>
      <button class="neon-button buy-btn" data-id="${p._id}">Купить</button>
    </div>
  `).join('');

  // Добавляем обработчики на кнопки "Купить"
  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const productId = btn.dataset.id;
      try {
        const result = await apiCall(`/api/deals/buy/${productId}`, { method: 'POST' });
        alert('Сделка создана! Ожидайте подтверждения продавца.');
        loadProducts(); // перезагрузить
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function setupSearch() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  searchBtn.addEventListener('click', () => {
    loadProducts('all', searchInput.value);
  });
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadProducts('all', searchInput.value);
    }
  });
}

function setupCategories() {
  const categoriesBtn = document.getElementById('categoriesBtn');
  const modal = document.getElementById('categoriesModal');
  const closeBtn = modal.querySelector('.close');
  const categoriesList = document.getElementById('categoriesList');

  categoriesBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  categoriesList.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
      const category = e.target.dataset.category;
      modal.style.display = 'none';
      loadProducts(category);
    }
  });
}
