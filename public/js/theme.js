function setTheme() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) {
    document.body.className = 'day';
  } else {
    document.body.className = 'night';
  }
}
setTheme();
setInterval(setTheme, 60000); // обновлять каждую минуту

// Также можно переключать вручную, если нужно
