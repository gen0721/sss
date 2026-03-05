document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  await loadDeals();
  setupTabs();
  setupModals();
});

async function loadProfile() {
  try {
    const user = await apiCall('/api/user/profile');
    document.getElementById('balance').textContent = user.balance;
    // Отображаем информацию о пользователе
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = `
      <img src="${user.photoUrl || 'assets/default-avatar.png'}" alt="avatar" class="profile-avatar">
      <h2>${user.firstName || ''} ${user.lastName || ''}</h2>
      <p>@${user.username || 'unknown'}</p>
      <p>ID: ${user.telegramId}</p>
      <p>Роль: ${user.role}</p>
    `;
  } catch (error) {
    console.error(error);
  }
}

async function loadDeals() {
  try {
    const deals = await apiCall('/api/user/deals');
    window.allDeals = deals; // сохраняем для переключения вкладок
    renderDeals(deals);
  } catch (error) {
    console.error(error);
  }
}

function renderDeals(deals, filter = 'all') {
  let filtered = deals;
  if (filter === 'purchases') {
    filtered = deals.filter(d => d.buyer._id === getUser().id);
  } else if (filter === 'sales') {
    filtered = deals.filter(d => d.seller._id === getUser().id);
  }
  const container = document.getElementById('tabContent');
  if (!filtered.length) {
    container.innerHTML = '<p>Нет сделок</p>';
    return;
  }
  container.innerHTML = filtered.map(d => `
    <div class="deal-item">
      <div>
        <strong>${d.product.title}</strong><br>
        Сумма: ${d.amount} USDT<br>
        Статус: <span class="status-${d.status}">${d.status}</span><br>
        ${d.buyer._id === getUser().id ? 'Вы покупатель' : 'Вы продавец'}<br>
        <small>${new Date(d.createdAt).toLocaleString()}</small>
      </div>
      ${d.status === 'pending' && d.buyer._id === getUser().id ? `
        <div>
          <button class="neon-button secondary confirm-btn" data-id="${d._id}">Подтвердить получение</button>
          <button class="neon-button cancel-btn" data-id="${d._id}">Отменить</button>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Обработчики для кнопок подтверждения/отмены
  document.querySelectorAll('.confirm-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await apiCall(`/api/deals/confirm/${btn.dataset.id}`, { method: 'POST' });
        alert('Сделка завершена, деньги переведены продавцу');
        loadDeals();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Вы уверены? Деньги вернутся на ваш баланс.')) return;
      try {
        await apiCall(`/api/deals/cancel/${btn.dataset.id}`, { method: 'POST' });
        alert('Сделка отменена, деньги возвращены');
        loadDeals();
        loadProfile(); // обновить баланс
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'deals') {
        renderDeals(window.allDeals);
      } else if (tab === 'purchases') {
        renderDeals(window.allDeals, 'purchases');
      } else if (tab === 'sales') {
        renderDeals(window.allDeals, 'sales');
      } else if (tab === 'transactions') {
        await loadTransactions();
      }
    });
  });
}

async function loadTransactions() {
  try {
    const transactions = await apiCall('/api/user/transactions');
    const container = document.getElementById('tabContent');
    if (!transactions.length) {
      container.innerHTML = '<p>Нет транзакций</p>';
      return;
    }
    container.innerHTML = transactions.map(t => `
      <div class="transaction-item">
        <div>
          <strong>${t.type === 'deposit' ? 'Пополнение' : t.type === 'withdraw' ? 'Вывод' : 'Оплата'}</strong><br>
          Сумма: ${t.amount} USDT<br>
          Статус: <span class="status-${t.status}">${t.status}</span><br>
          <small>${new Date(t.createdAt).toLocaleString()}</small>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
  }
}

function setupModals() {
  const depositBtn = document.getElementById('depositBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const depositModal = document.getElementById('depositModal');
  const withdrawModal = document.getElementById('withdrawModal');
  const closeButtons = document.querySelectorAll('.modal .close');

  depositBtn.addEventListener('click', () => {
    depositModal.style.display = 'block';
  });

  withdrawBtn.addEventListener('click', () => {
    withdrawModal.style.display = 'block';
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      depositModal.style.display = 'none';
      withdrawModal.style.display = 'none';
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === depositModal) depositModal.style.display = 'none';
    if (e.target === withdrawModal) withdrawModal.style.display = 'none';
  });

  document.getElementById('confirmDeposit').addEventListener('click', async () => {
    const amount = document.getElementById('depositAmount').value;
    if (!amount || amount < 1) return alert('Введите сумму не менее 1 USDT');
    try {
      const data = await apiCall('/api/payment/create-invoice', {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      document.getElementById('invoiceLink').style.display = 'block';
      document.getElementById('invoiceUrl').href = data.invoiceUrl;
      document.getElementById('invoiceUrl').textContent = data.invoiceUrl;
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('confirmWithdraw').addEventListener('click', async () => {
    const amount = document.getElementById('withdrawAmount').value;
    const wallet = document.getElementById('walletAddress').value;
    if (!amount || amount < 1) return alert('Введите сумму не менее 1 USDT');
    if (!wallet) return alert('Введите адрес кошелька');
    try {
      await apiCall('/api/payment/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, walletAddress: wallet })
      });
      alert('Запрос на вывод создан, ожидайте обработки');
      depositModal.style.display = 'none';
      withdrawModal.style.display = 'none';
      loadProfile(); // обновить баланс
    } catch (error) {
      alert(error.message);
    }
  });
}
