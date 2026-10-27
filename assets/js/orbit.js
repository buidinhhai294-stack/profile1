(function (app) {
  const { createBackground } = app;
  const { createLiquidEffect } = app;
  const { setOrbitLabel, refreshOrbitLabel } = app;
  const { createPopupController } = app;

  function initializeOrbit(site, items, sectionBodies) {
    const state = {
      popupMode: 'idle',
      activeSection: null,
      sectionLeaveTimer: 0,
      orbitSpeedFrame: 0,
      orbitPreviousTime: null,
      liquidFrame: 0,
      orbitTargetSpeed: 1,
    };
    const background = createBackground(site.backgroundWords);

    const portrait = document.querySelector('.portrait');
    // Fixed LED positions: only their brightness travels around the ring.
    const ringDots = document.createDocumentFragment();
    for (let index = 0; index < 72; index++) {
      const dot = document.createElement('span');
      const angle = ((index * 5 - 90) * Math.PI) / 180;
      dot.className = 'ring-dot';
      dot.style.cssText = `--dot-x: ${50 + Math.cos(angle) * 50}%; --dot-y: ${50 + Math.sin(angle) * 50}%; --led-delay: ${-5.4 + (index / 72) * 5.4}s;`;
      ringDots.append(dot);
    }
    portrait.querySelector('.border-ring').append(ringDots);
    const trigger = portrait.querySelector('.portrait-trigger');
    const core = portrait.querySelector('.portrait-core');
    const waves = [...portrait.querySelectorAll('.wave')];
    const waveLayer = portrait.querySelector('.wave-layer');
    const satellites = [...portrait.querySelectorAll('.satellite')];
    const satelliteLabels = items.map((item) => item.label);
    const satelliteImages = items.map((item) => item.image);
    const sectionDescriptions = items.map((item) => item.description);
    const portraitImage = portrait.querySelector('.portrait-image');
    const portraitFrame = portrait.querySelector('.portrait-frame');
    const originalImageAlt = portraitImage.alt;
    const sectionImages = [];
    const sectionCopies = [];

    let previewCommitTimer = 0;
    let previewIndex = null;
    let previewBaseIndex = null;

    satellites.forEach((satellite, index) => {
      const image = document.createElement('img');
      image.className = 'portrait-image section-image';
      image.src = satelliteImages[index];
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.decoding = 'async';
      image.style.objectPosition = items[index].imagePosition || 'center';
      portraitFrame.append(image);
      sectionImages.push(image);

      const copy = portrait.querySelector('.orbit-copy').cloneNode(true);
      copy.classList.add('section-copy');
      const pathId = `section-orbit-${index}`;
      copy.querySelector('path').id = pathId;
      copy.querySelector('textPath').setAttribute('href', `#${pathId}`);
      setOrbitLabel(copy, sectionDescriptions[index], 2);
      core.append(copy);
      sectionCopies.push(copy);
    });

    function previewSection(index) {
      clearTimeout(state.sectionLeaveTimer);
      if (state.popupMode !== 'idle' || !portrait.classList.contains('is-expanded')) return;
      if (previewIndex === index) return;
      clearTimeout(previewCommitTimer);
      if (previewBaseIndex === null && previewIndex !== null) previewBaseIndex = previewIndex;
      previewIndex = index;
      portrait.classList.add('is-previewing');
      direction = -1;
      if (!animationFrame && !reducedMotion.matches && !document.hidden) {
        previousTime = null;
        animationFrame = requestAnimationFrame(animateWaves);
      }
      sectionImages.forEach((image, position) => {
        image.classList.toggle('is-base', position === previewBaseIndex);
        image.classList.toggle('is-active', position === index);
      });
      const fadeTime =
        parseFloat(getComputedStyle(portrait).getPropertyValue('--preview-crossfade')) * 1000;
      previewCommitTimer = setTimeout(() => {
        if (previewIndex !== index) return;
        previewBaseIndex = index;
        sectionImages.forEach((image, position) =>
          image.classList.toggle('is-base', position === index)
        );
      }, fadeTime);
      sectionCopies.forEach((copy, position) =>
        copy.classList.toggle('is-active', position === index)
      );
      requestAnimationFrame(() => refreshOrbitLabel(sectionCopies[index]));
      portraitImage.alt = `Xem trước ${satelliteLabels[index]} — ${sectionDescriptions[index]}`;
    }

    function resetPreviewLayers() {
      clearTimeout(previewCommitTimer);
      previewIndex = null;
      previewBaseIndex = null;
      sectionImages.forEach((image) => image.classList.remove('is-active', 'is-base'));
    }

    function clearSectionPreview() {
      // Keep the current preview for one second when moving between satellites.
      clearTimeout(state.sectionLeaveTimer);
      state.sectionLeaveTimer = setTimeout(() => {
        if (state.popupMode !== 'idle') return;
        portrait.classList.remove('is-previewing');
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        previousTime = null;
        resetPreviewLayers();
        sectionCopies.forEach((copy) => copy.classList.remove('is-active'));
        portraitImage.alt = originalImageAlt;
      }, site.animation.previewReturnMs);
    }

    const dropDelays = items.map((_, i) => ((i * 0.61803398875) % 1) * 0.18);
    const dropDurations = items.map((_, i) => 0.5 + ((i * 0.37 + 0.6) % 1) * 0.1);
    const satelliteOpeningAnimations = [];
    const openingDuration = () =>
      parseFloat(getComputedStyle(portrait).getPropertyValue('--open-duration')) * 1000;
    // Reuse the same droplet path and spring timing in both directions.
    function satelliteBurstFrames(radius) {
      return [
        { opacity: 1, transform: `translateX(${radius * 0.3}px) scale(.08)`, offset: 0 },
        { opacity: 1, transform: `translateX(${radius * 0.52}px) scale(.78)`, offset: 0.2 },
        { opacity: 1, transform: `translateX(${radius * 0.82}px) scale(1.04, .96)`, offset: 0.52 },
        {
          opacity: 1,
          transform: `translateX(${radius * 1.045}px) scale(1.12, .88)`,
          offset: 0.65,
          easing: 'ease-out',
        },
        {
          opacity: 1,
          transform: `translateX(${radius * 0.985}px) scale(.96, 1.04)`,
          offset: 0.82,
          easing: 'ease-in-out',
        },
        { opacity: 1, transform: `translateX(${radius}px) scale(1)`, offset: 1 },
      ];
    }

    satellites.forEach((satellite, index) => {
      satellite.setAttribute('aria-label', `Mở mục ${satelliteLabels[index].toUpperCase()}`);
      if (items[index].action.type === 'popup') satellite.setAttribute('aria-haspopup', 'dialog');
      const label = document.createElement('span');
      label.className = 'satellite-label';
      label.style.setProperty('--label-reveal-delay', `${0.06 + index * 0.045}s`);
      label.textContent = satelliteLabels[index];
      const face = document.createElement('span');
      face.className = 'satellite-face';
      face.style.setProperty(
        '--menu-image',
        `url("${new URL(satelliteImages[index], document.baseURI).href}")`
      );
      face.style.setProperty('--menu-shade', items[index].maskOpacity ?? 0.16);
      face.style.setProperty('--menu-position', items[index].imagePosition || 'center');
      const photo = document.createElement('span');
      photo.className = 'satellite-photo';
      photo.setAttribute('aria-hidden', 'true');
      face.append(photo, label);
      satellite.append(face);
    });
    const drawLiquid = createLiquidEffect({ portrait, core, satellites, state });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let pointerInside = false;
    let direction = 1;
    let phase = 0;
    let waveTextClearanceUntil = 0;
    let previousTime = null;
    let animationFrame = 0;

    let hasOpened = false;

    const orbitSystem = portrait.querySelector('.satellite-system');
    const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
    let orbitSpeed = 1;

    let orbitPhase = 0;
    const orbitDuration =
      parseFloat(getComputedStyle(portrait).getPropertyValue('--satellite-orbit-duration')) * 1000;

    const satelliteAngles = satellites.map((satellite) =>
      parseFloat(satellite.parentElement.style.getPropertyValue('--angle'))
    );
    let ledClock = null;
    const ledEnvelope = [
      [0, 1],
      [0.03, 1],
      [0.07, 0.78],
      [0.13, 0.3],
      [0.21, 0],
      [1, 0],
    ];

    function clearSatelliteLights() {
      satellites.forEach((satellite) => satellite.style.removeProperty('--satellite-light'));
    }

    function syncSatelliteLights() {
      // Read the existing LED animation clock, rather than starting a second timer.
      if (!ledClock || ledClock.playState === 'idle') {
        ledClock = portrait
          .querySelector('.ring-dot')
          .getAnimations({ subtree: true })
          .find((animation) => animation.animationName === 'led-loading');
      }
      if (typeof ledClock?.currentTime !== 'number') return;
      const timing = ledClock.effect.getTiming();
      const phase = ((ledClock.currentTime - Number(timing.delay)) / Number(timing.duration)) % 1;
      satellites.forEach((satellite, index) => {
        const position = (satelliteAngles[index] + 90 + orbitPhase) / 360;
        const distance = (((phase - position) % 1) + 1) % 1;
        let light = 0;
        for (let stop = 1; stop < ledEnvelope.length; stop++) {
          const [end, endLight] = ledEnvelope[stop];
          if (distance <= end) {
            const [start, startLight] = ledEnvelope[stop - 1];
            light = startLight + ((endLight - startLight) * (distance - start)) / (end - start);
            break;
          }
        }
        satellite.style.setProperty('--satellite-light', light.toFixed(3));
      });
    }

    // One monotonic phase drives the orbit and every counter-rotation together.
    // Hover changes velocity only; it never retimes separate CSS animations.
    function animateOrbit(time) {
      state.orbitSpeedFrame = 0;
      const elapsed =
        state.orbitPreviousTime === null
          ? 0
          : Math.max(0, Math.min(time - state.orbitPreviousTime, 64));
      state.orbitPreviousTime = time;
      orbitSpeed = Math.max(
        0,
        Math.min(
          1,
          orbitSpeed + (state.orbitTargetSpeed - orbitSpeed) * (1 - Math.exp(-elapsed / 140))
        )
      );
      if (Math.abs(state.orbitTargetSpeed - orbitSpeed) < 0.002)
        orbitSpeed = state.orbitTargetSpeed;
      orbitPhase = (orbitPhase + (elapsed * orbitSpeed * 360) / orbitDuration) % 360;
      orbitSystem.style.setProperty('--orbit-phase', `${orbitPhase}deg`);
      syncSatelliteLights();
      // Keep the light synchronized even while hover holds the orbit still.
      state.orbitSpeedFrame = requestAnimationFrame(animateOrbit);
    }

    function syncOrbit() {
      cancelAnimationFrame(state.orbitSpeedFrame);
      state.orbitSpeedFrame = 0;
      state.orbitPreviousTime = null;
      if (
        state.popupMode === 'idle' &&
        portrait.classList.contains('is-expanded') &&
        !reducedMotion.matches &&
        !document.hidden
      ) {
        state.orbitSpeedFrame = requestAnimationFrame(animateOrbit);
      } else {
        clearSatelliteLights();
      }
    }

    function easeOrbitSpeed(hovered) {
      if (
        state.popupMode !== 'idle' ||
        !portrait.classList.contains('is-expanded') ||
        !fineHover.matches ||
        reducedMotion.matches
      )
        return;
      state.orbitTargetSpeed = hovered ? 0 : 1;
      if (!state.orbitSpeedFrame) syncOrbit();
    }

    satellites.forEach((satellite, index) => {
      satellite.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch' || !fineHover.matches || state.popupMode !== 'idle')
          return;
        easeOrbitSpeed(true);
        previewSection(index);
      });
      satellite.addEventListener('pointerleave', () => {
        easeOrbitSpeed(false);
        clearSectionPreview();
      });
      if (items[index].action.type === 'popup')
        satellite.addEventListener('click', () => popup.openSection(index));
      satellite.addEventListener('focus', () => previewSection(index));
      satellite.addEventListener('blur', clearSectionPreview);
    });

    function updateHover() {
      const active = !hasOpened && (pointerInside || trigger.matches(':focus-visible'));
      if (!active && portrait.classList.contains('is-hovered'))
        waveTextClearanceUntil = performance.now() + 450;
      portrait.classList.toggle('is-hovered', active);
      direction = active || portrait.classList.contains('is-previewing') ? -1 : 1;
    }

    // Keep the full-size hover area stable while only the portrait shrinks.
    portrait.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      pointerInside = true;
      updateHover();
    });
    portrait.addEventListener('pointerleave', () => {
      pointerInside = false;
      updateHover();
    });
    trigger.addEventListener('focus', updateHover);
    trigger.addEventListener('blur', updateHover);

    function finishOpening() {
      cancelAnimationFrame(state.liquidFrame);
      portrait.classList.remove('is-opening');
      portrait.classList.add('is-expanded');
      satelliteOpeningAnimations.splice(0).forEach((effect) => effect.cancel());
      orbitSystem.inert = false;
      syncOrbit();
    }

    const popup = createPopupController({
      state,
      site,
      items,
      sectionBodies,
      portrait,
      previewSection,
      clearSatelliteLights,
      satellites,
      openingDuration,
      dropDurations,
      dropDelays,
      satelliteBurstFrames,
      drawLiquid,
      sectionImages,
      sectionCopies,
      portraitImage,
      originalImageAlt,
      resetPreviewLayers,
      syncOrbit,
      reducedMotion,
      satelliteLabels,
      satelliteImages,
      sectionDescriptions,
    });
    trigger.addEventListener('click', () => {
      if (hasOpened) return;
      hasOpened = true;
      const currentTransform = getComputedStyle(core).transform;
      const currentScale =
        core.getBoundingClientRect().width / portrait.getBoundingClientRect().width;
      core.style.setProperty(
        '--opening-transform',
        currentTransform === 'none' ? 'scale(1)' : currentTransform
      );
      portrait.style.setProperty('--opening-inset', `${(1 - currentScale) * 50}%`);
      updateHover();
      portrait.classList.add('is-opening');
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-disabled', 'true');
      trigger.setAttribute('aria-label', `${items.length} sections are open around the portrait`);
      if (reducedMotion.matches) finishOpening();
      else {
        const duration = openingDuration();
        satellites.forEach((satellite, index) => {
          satelliteOpeningAnimations.push(
            satellite.animate(satelliteBurstFrames(portrait.offsetWidth), {
              duration: duration * dropDurations[index],
              delay: duration * (0.18 + dropDelays[index]),
              easing: 'linear',
              fill: 'both',
            })
          );
        });
        drawLiquid();
      }
    });

    core.addEventListener('animationend', (event) => {
      if (event.animationName === 'avatar-open') finishOpening();
    });

    function animateWaves(time) {
      animationFrame = 0;
      if (
        hasOpened &&
        (state.popupMode !== 'idle' || !portrait.classList.contains('is-previewing'))
      ) {
        previousTime = null;
        return;
      }
      const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 64);
      previousTime = time;
      // Clip the wave and its glow outside the text, including the hover transition.
      const protectText =
        portrait.classList.contains('is-hovered') ||
        portrait.classList.contains('is-previewing') ||
        time < waveTextClearanceUntil;
      waveLayer.classList.toggle('has-text-clearance', protectText);
      if (protectText) {
        // The SVG text extends to radius 90/200 on a canvas 164% of the core.
        const textEdge = core.getBoundingClientRect().width * 1.64 * 0.45 + 4;
        waveLayer.style.setProperty('--wave-text-edge', `${textEdge}px`);
      }
      // Reverse the current phase so each wave changes direction without jumping.
      phase = (phase + (direction * elapsed) / site.animation.waveMs + 1) % 1;
      waves.forEach((wave, index) => {
        const progress = (phase + index / waves.length) % 1;
        wave.style.transform = `scale(${0.5 + progress * 2})`;
        // A fresh wave emerges white, then steadily loses light as it travels out.
        const light = Math.max(0, 1 - Math.max(0, progress - 0.25) / 0.75);
        wave.style.opacity = String(0.95 * light * light);
      });
      animationFrame = requestAnimationFrame(animateWaves);
    }

    function syncMotion() {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = null;
      background.setPaused(document.hidden);
      if (reducedMotion.matches && portrait.classList.contains('is-opening')) finishOpening();
      syncOrbit();
      if (
        (!hasOpened ||
          (portrait.classList.contains('is-previewing') && state.popupMode === 'idle')) &&
        !reducedMotion.matches &&
        !document.hidden
      ) {
        animationFrame = requestAnimationFrame(animateWaves);
      }
    }

    reducedMotion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    syncMotion();
  }

  Object.assign(app, { initializeOrbit });
})((window.Portfolio ||= {}));
