(async function (app) {
  const { loadConfiguration, applyConfiguration } = app;
  const { initializeOrbit } = app;

  try {
    const { site, items, sectionBodies } = await loadConfiguration();
    applyConfiguration(site, items);
    initializeOrbit(site, items, sectionBodies);
  } catch (error) {
    console.error('Portfolio setup failed:', error);
    const status = document.querySelector('#startup-status');
    status.hidden = false;
    status.textContent = `Không thể tải hồ sơ này. ${error.message} Vui lòng kiểm tra config/site.json và config/menu.json.`;
  }
})((window.Portfolio ||= {}));
