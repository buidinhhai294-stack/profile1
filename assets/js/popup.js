(function (app) {
  const { createContentWidgets } = app;

  function createPopupController({
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
  }) {
    const sectionDialog = document.querySelector('.section-dialog');
    const popupSurface = sectionDialog.querySelector('.popup-surface');
    const popupCover = sectionDialog.querySelector('.popup-cover');
    const popupLoader = sectionDialog.querySelector('.popup-loader');
    const popupLoaderProgress = sectionDialog.querySelector('.popup-loader-progress');
    const popupContent = sectionDialog.querySelector('.popup-content');
    const popupClose = sectionDialog.querySelector('.popup-close');
    const popupToolbar = sectionDialog.querySelector('.popup-toolbar');
    const popupEffects = new Set();
    let popupRun = 0;
    let mergingAnimations = [];

    const popupDetail = sectionDialog.querySelector('.popup-detail');
    const widgets = createContentWidgets({
      popupDetail,
      photoDialog: document.querySelector('.gallery-lightbox'),
      reducedMotion,
      profile: site.profile,
    });

    function popupAnimation(element, frames, options) {
      const effect = element.animate(frames, {
        fill: 'forwards',
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        ...options,
        ...(reducedMotion.matches ? { duration: 0, delay: 0 } : {}),
      });
      popupEffects.add(effect);
      return effect.finished.catch(() => {});
    }

    function popupDimensions() {
      return {
        width: Math.min(site.popup.maxWidth, window.innerWidth - 32),
        height: Math.min(site.popup.maxHeight, window.innerHeight - 48),
      };
    }

    function cancelPopupEffects() {
      popupEffects.forEach((effect) => effect.cancel());
      popupEffects.clear();
    }

    async function openSection(index) {
      if (state.popupMode !== 'idle' || !portrait.classList.contains('is-expanded')) return;
      previewSection(index);
      clearTimeout(state.sectionLeaveTimer);
      const run = ++popupRun;
      state.activeSection = index;
      state.popupMode = 'merging';
      clearSatelliteLights();
      cancelAnimationFrame(state.orbitSpeedFrame);
      state.orbitSpeedFrame = 0;
      state.orbitPreviousTime = null;

      const radius = new DOMMatrixReadOnly(getComputedStyle(satellites[0]).transform).m41;
      // Retract droplets in 60% of the outward duration; their delays and contour fade share this clock.
      const duration = openingDuration() * 0.6;
      const lastEnd = Math.max(
        ...dropDurations.map((length, position) => 0.18 + dropDelays[position] + length)
      );
      portrait.style.setProperty('--merge-duration', `${duration * (lastEnd - 0.18)}ms`);
      portrait.classList.add('is-merging');
      portrait.inert = true;
      const returns = satellites.map((satellite, position) =>
        popupAnimation(satellite, satelliteBurstFrames(radius), {
          duration: duration * dropDurations[position],
          delay: duration * (lastEnd - (0.18 + dropDelays[position] + dropDurations[position])),
          direction: 'reverse',
          easing: 'linear',
          fill: 'both',
        })
      );
      mergingAnimations = [...popupEffects].filter((effect) =>
        satellites.includes(effect.effect?.target)
      );
      if (!reducedMotion.matches) drawLiquid();
      await Promise.all(returns);
      if (run !== popupRun) return;
      cancelAnimationFrame(state.liquidFrame);

      sectionDialog.querySelector('.popup-kicker').textContent =
        `${String(index + 1).padStart(2, '0')} / ${satelliteLabels[index]}`;
      sectionDialog.querySelector('.popup-title').textContent =
        items[index].title || items[index].label;
      sectionDialog.querySelector('.popup-description').textContent = sectionDescriptions[index];
      sectionDialog.querySelector('.popup-detail').innerHTML = sectionBodies.get(items[index].id);
      widgets.initialize();
      popupCover.src = satelliteImages[index];
      popupCover.style.objectPosition = items[index].imagePosition || 'center';
      popupCover.style.opacity = '1';
      popupLoader.style.opacity = '0';
      popupLoader.style.transform = 'rotate(-90deg)';
      popupLoaderProgress.style.strokeDashoffset = '1';
      popupContent.style.opacity = '0';
      popupToolbar.inert = true;
      sectionDialog.classList.remove('has-content');
      popupContent.inert = true;
      popupContent.scrollTop = 0;
      const imageBounds = sectionImages[index].getBoundingClientRect();
      popupSurface.style.width = `${imageBounds.width}px`;
      popupSurface.style.height = `${imageBounds.height}px`;
      popupSurface.style.borderRadius = '50%';
      sectionDialog.showModal();
      sectionDialog.classList.add('is-loading');
      sectionDialog.setAttribute('aria-busy', 'true');
      portrait.classList.add('is-popup');
      state.popupMode = 'morphing';

      // Keep the photo still while the progress ring completes around it.
      // Only the solid surface grows into the popup after the ring fades.
      const discSize = portraitImage.offsetWidth;
      await Promise.all([
        popupAnimation(
          popupSurface,
          [
            {
              width: `${imageBounds.width}px`,
              height: `${imageBounds.height}px`,
              borderRadius: '50%',
            },
            { width: `${discSize}px`, height: `${discSize}px`, borderRadius: '50%' },
          ],
          { duration: 580, easing: 'cubic-bezier(.22, .7, .2, 1)' }
        ),
        popupAnimation(popupLoader, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 180,
          easing: 'ease-out',
        }),
        popupAnimation(
          popupLoader,
          [{ transform: 'rotate(-90deg)' }, { transform: 'rotate(270deg)' }],
          { duration: 1000, easing: 'linear' }
        ),
        popupAnimation(
          popupLoaderProgress,
          [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
          {
            duration: 1000,
            easing: 'ease-in-out',
          }
        ),
      ]);
      if (run !== popupRun) return;
      await Promise.all([
        popupAnimation(popupCover, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 320,
          easing: 'ease-in-out',
        }),
        popupAnimation(popupLoader, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 240,
          easing: 'ease-in-out',
        }),
      ]);
      if (run !== popupRun) return;
      sectionDialog.classList.remove('is-loading');
      const size = popupDimensions();
      await popupAnimation(
        popupSurface,
        [
          { width: `${discSize}px`, height: `${discSize}px`, borderRadius: '50%' },
          { width: `${size.width}px`, height: `${size.height}px`, borderRadius: '20px' },
        ],
        { duration: 820, easing: 'cubic-bezier(.4, 0, .2, 1)' }
      );
      if (run !== popupRun) return;
      // Reset after the surface has reached its final size, before revealing content.
      popupContent.scrollTop = 0;
      state.popupMode = 'open';
      popupToolbar.inert = false;
      sectionDialog.classList.add('has-content');
      sectionDialog.removeAttribute('aria-busy');
      popupContent.inert = false;
      await popupAnimation(
        popupContent,
        [
          { opacity: 0, transform: 'translateY(7px)' },
          { opacity: 1, transform: 'translateY(0px)' },
        ],
        { duration: 220, easing: 'ease-out' }
      );
      if (run === popupRun) {
        const track = popupDetail.querySelector('.project-track');
        if (track) widgets.updateProjectCounter(track);
        popupClose.focus({ preventScroll: true });
      }
    }

    async function closeSection() {
      if (state.popupMode === 'idle' || state.popupMode === 'closing') return;
      const index = state.activeSection;
      const interruptedMerge = state.popupMode === 'merging';
      ++popupRun;
      state.popupMode = 'closing';
      popupToolbar.inert = true;
      sectionDialog.classList.remove('has-content');
      clearTimeout(state.sectionLeaveTimer);

      if (interruptedMerge) {
        // Escape during the merge reverses from the current frame without a jump.
        portrait.classList.add('is-restoring');
        await Promise.all(
          mergingAnimations.map((effect) => {
            effect.reverse();
            return effect.finished.catch(() => {});
          })
        );
      } else {
        cancelAnimationFrame(state.liquidFrame);
        const rect = popupSurface.getBoundingClientRect();
        const rounding = getComputedStyle(popupSurface).borderRadius;
        const coverOpacity = getComputedStyle(popupCover).opacity;
        const contentOpacity = getComputedStyle(popupContent).opacity;
        popupSurface.style.width = `${rect.width}px`;
        popupSurface.style.height = `${rect.height}px`;
        popupSurface.style.borderRadius = rounding;
        popupCover.style.opacity = coverOpacity;
        popupContent.style.opacity = contentOpacity;
        cancelPopupEffects();
        popupLoader.style.opacity = '0';
        popupContent.inert = true;
        sectionDialog.setAttribute('aria-busy', 'true');
        const diameter = portraitImage.offsetWidth;

        // Shrink straight back into the photo, then separate the droplets.
        await popupAnimation(
          popupContent,
          [
            { opacity: contentOpacity, transform: 'translateY(0px)' },
            { opacity: 0, transform: 'translateY(7px)' },
          ],
          { duration: 220, easing: 'ease-in' }
        );
        sectionDialog.classList.remove('is-loading');
        await Promise.all([
          popupAnimation(
            popupSurface,
            [
              { width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: rounding },
              { width: `${diameter}px`, height: `${diameter}px`, borderRadius: '50%' },
            ],
            { duration: 820 }
          ),
          popupAnimation(popupCover, [{ opacity: coverOpacity }, { opacity: 1 }], {
            duration: 320,
            delay: 500,
            easing: 'ease-in-out',
          }),
        ]);
        sectionDialog.close();
        sectionDialog.removeAttribute('aria-busy');
        sectionDialog.classList.remove('is-loading');
        cancelPopupEffects();

        // Replay the same separation paths after the circle returns to the page.
        portrait.classList.remove('is-popup');
        portrait.classList.add('is-restoring');
        const duration = openingDuration();
        const bursts = satellites.map((satellite, position) =>
          popupAnimation(satellite, satelliteBurstFrames(portrait.offsetWidth), {
            duration: duration * dropDurations[position],
            delay: duration * dropDelays[position],
            easing: 'linear',
            fill: 'both',
          })
        );
        resetPreviewLayers();
        if (!reducedMotion.matches) drawLiquid();
        await Promise.all(bursts);
      }
      cancelAnimationFrame(state.liquidFrame);
      cancelPopupEffects();
      mergingAnimations = [];
      portrait.classList.remove('is-merging', 'is-restoring', 'is-popup', 'is-previewing');
      resetPreviewLayers();
      sectionCopies.forEach((copy) => copy.classList.remove('is-active'));
      portraitImage.alt = originalImageAlt;
      portrait.inert = false;
      // Restore keyboard focus while previews are still blocked by the closing state.
      // Otherwise the focus handler immediately replaces the original portrait again.
      satellites[index].focus({ preventScroll: true });
      state.popupMode = 'idle';
      state.activeSection = null;
      state.orbitTargetSpeed = 1;
      syncOrbit();
    }

    popupClose.addEventListener('click', closeSection);
    sectionDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeSection();
    });
    sectionDialog.addEventListener('click', (event) => {
      if (event.target === sectionDialog) closeSection();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.popupMode === 'merging') {
        event.preventDefault();
        closeSection();
      }
    });
    window.addEventListener('resize', () => {
      if (state.popupMode !== 'open') return;
      const size = popupDimensions();
      popupSurface.style.width = `${size.width}px`;
      popupSurface.style.height = `${size.height}px`;
      popupSurface.style.borderRadius = '20px';
      const track = popupDetail.querySelector('.project-track');
      if (track) widgets.updateProjectCounter(track);
      popupEffects.forEach((effect) => {
        if (effect.effect?.target === popupSurface) {
          effect.cancel();
          popupEffects.delete(effect);
        }
      });
    });

    return { openSection };
  }

  Object.assign(app, { createPopupController });
})((window.Portfolio ||= {}));
