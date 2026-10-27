(function (app) {
  const { setOrbitLabel } = app;

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function localPath(value, extension) {
    return (
      typeof value === 'string' &&
      !value.includes('..') &&
      !/[\\:#?\s]/.test(value) &&
      !value.startsWith('/') &&
      extension.test(value)
    );
  }
  function menuAngles(count) {
    assert(Number.isInteger(count) && count > 0 && count <= 24, 'Menu must contain 1–24 entries.');
    return Array.from({ length: count }, (_, index) => -90 + (index * 360) / count);
  }
  function validateConfiguration(site, items) {
    assert(site && typeof site === 'object', 'Invalid site configuration.');
    for (const key of ['title', 'description', 'name', 'avatarAlt', 'callToAction'])
      assert(typeof site[key] === 'string' && site[key].trim(), `site.${key} is required.`);
    assert(localPath(site.avatar, /\.(jpg|jpeg|png|webp|avif|svg)$/i), 'Invalid avatar path.');
    assert(
      Array.isArray(site.backgroundWords) &&
        site.backgroundWords.length &&
        site.backgroundWords.every((word) => typeof word === 'string' && word.trim()),
      'backgroundWords must contain text.'
    );
    for (const key of ['page', 'surface', 'ink', 'muted', 'accent', 'line'])
      assert(/^#[\da-f]{6}$/i.test(site.colors?.[key]), `Invalid color: ${key}.`);
    for (const key of [
      'orbitSeconds',
      'openingSeconds',
      'previewReturnMs',
      'previewCrossfadeSeconds',
      'waveMs',
    ])
      assert(
        Number.isFinite(site.animation?.[key]) && site.animation[key] > 0,
        `Invalid animation setting: ${key}.`
      );
    for (const key of ['maxWidth', 'maxHeight'])
      assert(
        Number.isFinite(site.popup?.[key]) && site.popup[key] >= 240,
        `Invalid popup setting: ${key}.`
      );
    if (site.profile !== undefined)
      assert(
        Number.isInteger(site.profile.careerStartYear) &&
          site.profile.careerStartYear >= 1900 &&
          site.profile.careerStartYear <= new Date().getFullYear(),
        'Invalid profile.careerStartYear.'
      );
    assert(Array.isArray(items), 'Menu must be an array.');
    menuAngles(items.length);
    const ids = new Set();
    for (const item of items) {
      assert(
        /^[a-z][a-z0-9-]*$/.test(item.id) && !ids.has(item.id),
        `Duplicate or invalid menu id: ${item.id}.`
      );
      ids.add(item.id);
      assert(
        typeof item.label === 'string' && item.label.trim() && typeof item.description === 'string',
        `Missing label/description: ${item.id}.`
      );
      assert(
        localPath(item.image, /\.(jpg|jpeg|png|webp|avif|svg)$/i),
        `Invalid image: ${item.id}.`
      );
      if (item.maskOpacity !== undefined)
        assert(
          Number.isFinite(item.maskOpacity) && item.maskOpacity >= 0 && item.maskOpacity <= 1,
          `Invalid mask opacity: ${item.id}.`
        );
      assert(
        item.action && ['popup', 'link'].includes(item.action.type),
        `Invalid action: ${item.id}.`
      );
      if (item.action.type === 'popup')
        assert(localPath(item.action.content, /\.html$/i), `Invalid content path: ${item.id}.`);
      else {
        assert(
          typeof item.action.url === 'string' &&
            (/^(https?:\/\/|mailto:|tel:|#)/i.test(item.action.url) ||
              localPath(item.action.url, /\.html$/i)),
          `Unsafe or invalid link: ${item.id}.`
        );
        assert(
          item.action.newTab === undefined || typeof item.action.newTab === 'boolean',
          `Invalid newTab: ${item.id}.`
        );
      }
    }
    return { site, items };
  }
  async function readFile(url, json = false) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot load ${url} (${response.status}).`);
    try {
      return json ? await response.json() : await response.text();
    } catch {
      throw new Error(`Invalid JSON in ${url}.`);
    }
  }
  async function loadConfiguration() {
    if (window.location.protocol === 'file:') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'assets/js/offline-data.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Cannot load assets/js/offline-data.js.'));
        document.head.append(script);
      });
      const { site, items, sections } = app.offlineData;
      validateConfiguration(site, items);
      return { site, items, sectionBodies: new Map(Object.entries(sections)) };
    }
    const [site, items] = await Promise.all([
      readFile('config/site.json', true),
      readFile('config/menu.json', true),
    ]);
    validateConfiguration(site, items);
    const entries = await Promise.all(
      items
        .filter((item) => item.action.type === 'popup')
        .map(async (item) => [item.id, await readFile(item.action.content)])
    );
    return { site, items, sectionBodies: new Map(entries) };
  }
  function applyConfiguration(site, items) {
    document.title = site.title;
    document.querySelector('meta[name="description"]').content = site.description;
    document.querySelector('meta[name="theme-color"]').content = site.colors.page;
    for (const [key, value] of Object.entries(site.colors))
      document.documentElement.style.setProperty('--' + key, value);
    for (const [key, value] of Object.entries({
      'satellite-orbit-duration': site.animation.orbitSeconds + 's',
      'open-duration': site.animation.openingSeconds + 's',
      'preview-crossfade': site.animation.previewCrossfadeSeconds + 's',
    }))
      document.documentElement.style.setProperty('--' + key, value);
    // Keep neighboring circles clear when more entries are added.
    const spacing = 2 * Math.sin(Math.PI / Math.max(3, items.length)) * 0.7;
    document.documentElement.style.setProperty(
      '--satellite-size',
      `min(clamp(56px, calc(var(--portrait-size) * 0.444), 160px), calc(var(--orbit-radius) * ${spacing}))`
    );
    document.querySelector('.portrait-image').src = site.avatar;
    document.querySelector('.portrait-image').alt = site.avatarAlt;
    setOrbitLabel(document.querySelector('.orbit-copy'), site.callToAction, 3);
    const brand = document.querySelector('.popup-brand > span:last-child');
    brand.replaceChildren(document.createTextNode(site.name.toUpperCase()));
    const divider = document.createElement('span');
    divider.className = 'popup-brand-divider';
    divider.textContent = '/';
    brand.append(divider, document.createTextNode('PORTFOLIO'));
    document.querySelector('main').setAttribute('aria-label', site.title);
    const system = document.querySelector('.satellite-system');
    const angles = menuAngles(items.length);
    items.forEach((item, index) => {
      const spoke = document.createElement('span');
      spoke.className = 'satellite-spoke';
      spoke.style.setProperty('--angle', angles[index] + 'deg');
      const target = document.createElement(item.action.type === 'link' ? 'a' : 'button');
      target.className = 'satellite';
      if (item.action.type === 'link') {
        target.href = item.action.url;
        if (item.action.newTab) {
          target.target = '_blank';
          target.rel = 'noopener noreferrer';
        }
      } else target.type = 'button';
      spoke.append(target);
      system.append(spoke);
    });
    const trigger = document.querySelector('.portrait-trigger');
    trigger.setAttribute('aria-label', `Khám phá ${items.length} mục quanh ảnh chân dung`);
    trigger.disabled = false;
  }

  Object.assign(app, { menuAngles, validateConfiguration, loadConfiguration, applyConfiguration });
})((window.Portfolio ||= {}));
