const tg = window.Telegram.WebApp;
tg.expand();

// Автоматическая аутентификация при загрузке
(async function initAuth() {
  try {
    const initData = tg.initData;
    if (!initData) {
      console.warn('Not running in Telegram');
      return;
    }
    const data = await apiCall('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData })
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    tg.MainButton.setText('Закрыть').show();
  } catch (error) {
    console.error('Auth failed', error);
  }
})();

function getUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}
