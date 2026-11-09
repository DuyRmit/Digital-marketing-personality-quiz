if (location.hash === '#board' || location.hash === '#admin') {
  document.body.classList.add('kiosk');
  document.documentElement.classList.add('kiosk');
  state.screen = 'board';
  initKiosk();
}
render();
