if (location.hash === '#admin') {
  /* trang admin tĩnh (js/admin.js): lọc, lưu session, card chim mồi */
  document.body.classList.add('admin-mode');
  initAdmin();
} else {
  if (location.hash === '#board') {
    document.body.classList.add('kiosk');
    document.documentElement.classList.add('kiosk');
    state.screen = 'board';
    initKiosk();
  }
  render();
}
