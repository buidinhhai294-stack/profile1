(function (app) {
  function createContentWidgets({ popupDetail, photoDialog, reducedMotion, profile }) {
    let galleryPhotos = [];
    let visiblePhotos = [];
    let currentPhoto = 0;

    function showGalleryPhoto(index) {
      currentPhoto = index;
      const { title, src } = galleryPhotos[index];
      photoDialog.querySelector('.lightbox-image').src = src;
      photoDialog.querySelector('.lightbox-image').alt = title;
      photoDialog.querySelector('.lightbox-title').textContent = title;
      photoDialog.querySelector('.lightbox-count').textContent =
        `${String(visiblePhotos.indexOf(index) + 1).padStart(2, '0')} / ${String(visiblePhotos.length).padStart(2, '0')}`;
      if (!photoDialog.open) photoDialog.showModal();
    }
    function stepGallery(step) {
      const position = visiblePhotos.indexOf(currentPhoto);
      showGalleryPhoto(
        visiblePhotos[(position + step + visiblePhotos.length) % visiblePhotos.length]
      );
    }
    photoDialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-photo-close]') || event.target === photoDialog)
        photoDialog.close();
      const control = event.target.closest('[data-photo-step]');
      if (control) stepGallery(Number(control.dataset.photoStep));
    });
    photoDialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        stepGallery(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });

    function projectMetrics(track) {
      const card = track.querySelector('.project-card');
      const step =
        card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
      const visible = Math.max(
        1,
        Math.floor((track.clientWidth + 1) / step) + (track.clientWidth >= step * 2 ? 1 : 0)
      );
      return { step, visible, first: Math.round(track.scrollLeft / step) };
    }
    function updateProjectCounter(track) {
      const { first, visible } = projectMetrics(track);
      const numbers = Array.from(
        { length: Math.min(visible, track.querySelectorAll('.project-card').length - first) },
        (_, index) => String(first + index + 1).padStart(2, '0')
      );
      popupDetail.querySelector('.project-counter').textContent =
        `${numbers.join(' · ')} / ${String(track.querySelectorAll('.project-card').length).padStart(2, '0')}`;
    }
    function moveProjects(direction) {
      const track = popupDetail.querySelector('.project-track');
      const { first, step, visible } = projectMetrics(track);
      const last = Math.max(0, track.querySelectorAll('.project-card').length - visible);
      const next = direction > 0 ? (first >= last ? 0 : first + 1) : first <= 0 ? last : first - 1;
      track.scrollTo({ left: next * step, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
    function updateProfileStats() {
      const startYear = profile?.careerStartYear;
      const experience = Number.isInteger(startYear)
        ? `${Math.max(0, new Date().getFullYear() - startYear)}+`
        : '—';
      popupDetail.querySelectorAll('[data-profile-stat="experience"]').forEach((element) => {
        element.textContent = experience;
      });
    }

    function initializeSectionContent() {
      if (popupDetail.querySelector('[data-profile-stat]')) updateProfileStats();
      galleryPhotos = [...popupDetail.querySelectorAll('[data-photo]')].map((tile, index) => {
        tile.dataset.photo = index;
        const image = tile.querySelector('img');
        return { title: image.alt, src: image.getAttribute('src') };
      });
      visiblePhotos = galleryPhotos.map((_, index) => index);
      const track = popupDetail.querySelector('.project-track');
      if (track) {
        track.addEventListener('scroll', () => updateProjectCounter(track), { passive: true });
        track.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            moveProjects(event.key === 'ArrowLeft' ? -1 : 1);
          }
        });
      }
    }
    popupDetail.addEventListener('click', (event) => {
      const projectControl = event.target.closest('[data-project-step]');
      if (projectControl) moveProjects(Number(projectControl.dataset.projectStep));
      const filter = event.target.closest('[data-gallery-filter]');
      if (filter) {
        const category = filter.dataset.galleryFilter;
        popupDetail
          .querySelectorAll('[data-gallery-filter]')
          .forEach((button) => button.setAttribute('aria-pressed', String(button === filter)));
        visiblePhotos = [];
        popupDetail.querySelectorAll('[data-photo]').forEach((tile) => {
          tile.hidden = category !== 'all' && tile.dataset.category !== category;
          if (!tile.hidden) visiblePhotos.push(Number(tile.dataset.photo));
        });
      }
      const photo = event.target.closest('[data-photo]');
      if (photo) showGalleryPhoto(Number(photo.dataset.photo));
    });
    popupDetail.addEventListener('submit', (event) => {
      if (!event.target.matches('.contact-form')) return;
      event.preventDefault();
      const form = event.target;
      const name = new FormData(form).get('name').trim();
      form.querySelector('.form-status').textContent =
        `Cảm ơn ${name}! Lời nhắn mẫu của bạn đã được ghi nhận trên trang này. Không có email nào được gửi đi.`;
      form.reset();
    });

    return { initialize: initializeSectionContent, updateProjectCounter };
  }

  Object.assign(app, { createContentWidgets });
})((window.Portfolio ||= {}));
