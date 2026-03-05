document.addEventListener('DOMContentLoaded', () => {
  loadAdminData('users');
  setupAdminTabs();
});

async function loadAdminData(tab) {
  try {
    const contentDiv = document.getElementById('adminContent');
    if (tab === 'users') {
      const users = await apiCall('/api/admin/users');
      contentDiv.innerHTML = users.map(u => `
        <div class="user-item">
          <span>@${u.username} (${u.firstName})</span>
          <span>Баланс: ${u.balance} USDT</span>
          <span>Роль: ${u.role}</span>
        </div>
      `).join('');
    } else if (tab === 'deals') {
      const deals = await apiCall('/api/admin/deals');
      contentDiv.innerHTML = deals.map(d => `
        <div class="deal-item">
          <div>
            <strong>${d.product?.title}</strong><br>
            Покупатель: @${d.buyer?.username}<br>
            Продавец: @${d.seller?.username}<br>
            Сумма: ${d.amount} USDT<br>
            Статус: <span class="status-${d.status}">${d.status}</span><br>
            <small>${new Date(d.createdAt).toLocaleString()}</small>
          </div>
          ${d.status === 'pending' ? `
            <div>
              <button class="neon-button secondary refund-btn" data-id="${d._id}">Вернуть деньги</button>
              <button class="neon-button complete-btn" data-id="${d._id}">Завершить принудительно</button>
            </div>
          ` : ''}
        </div>
      `).join('');

      // Обработчики для админских действий
      document.querySelectorAll('.refund-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Вернуть деньги покупателю?')) return;
          try {
            await apiCall(`/api/admin/deal/${btn.dataset.id}/refund`, { method: 'POST' });
            alert('Деньги возвращены');
            loadAdminData('deals');
          } catch (error) {
            alert(error.message);
          }
        });
      });

      document.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Завершить сделку и перевести деньги продавцу?')) return;
          try {
            await apiCall(`/api/admin/deal/${btn.dataset.id}/complete`, { method: 'POST' });
            alert('Сделка завершена');
            loadAdminData('deals');
          } catch (error) {
            alert(error.message);
          }
        });
      });
    } else if (tab === 'products') {
      const products = await apiCall('/api/admin/products');
      contentDiv.innerHTML = products.map(p => `
        <div class="product-item">
          <span>${p.title} (${p.price} USDT)</span>
          <span>Продавец: @${p.seller?.username}</span>
          <span>Статус: ${p.status}</span>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error(error);
    document.getElementById('adminContent').innerHTML = '<p>Ошибка загрузки</p>';
  }
}

function setupAdminTabs() {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAdminData(btn.dataset.tab);
    });
  });
}
