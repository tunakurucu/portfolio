const lightbox = document.getElementById('lightbox');
const closeButton = lightbox && lightbox.querySelector('.lightbox-close');

if (!lightbox || !closeButton) {
  throw new Error('gallery.js: missing #lightbox container or .lightbox-close button; gallery not initialised.');
}

const galleryItems = [...document.querySelectorAll('.media-item')]
  .filter((item) => {
    if (item.dataset.src) return true;
    console.error('gallery.js: skipping .media-item without data-src', item);
    return false;
  })
  .map((item) => ({
    type: item.dataset.type,
    src: item.dataset.src,
    trigger: item,
  }));

const errorMessage = document.createElement('p');
errorMessage.className = 'lightbox-error';
errorMessage.setAttribute('role', 'alert');
errorMessage.hidden = true;
errorMessage.textContent = 'Bu icerik yuklenemedi.';

const stage = document.createElement('div');
stage.className = 'lightbox-stage';
stage.setAttribute('tabindex', '-1');

const previousButton = document.createElement('button');
previousButton.className = 'lightbox-arrow lightbox-arrow-previous';
previousButton.type = 'button';
previousButton.setAttribute('aria-label', 'Onceki calisma');
previousButton.innerHTML = '<span aria-hidden="true">‹</span>';

const nextButton = document.createElement('button');
nextButton.className = 'lightbox-arrow lightbox-arrow-next';
nextButton.type = 'button';
nextButton.setAttribute('aria-label', 'Sonraki calisma');
nextButton.innerHTML = '<span aria-hidden="true">›</span>';

lightbox.append(stage, errorMessage, previousButton, nextButton);

let currentIndex = 0;
let lastFocusedTrigger = null;
let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
let touchDeltaY = 0;
let isPointerDown = false;

function showError(item, detail) {
  console.error(`gallery.js: failed to load ${item.type || 'media'} "${item.src}"`, detail || '');
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.hidden = true;
}

function isLightboxOpen() {
  return lightbox.classList.contains('show');
}

function cleanupMedia(node) {
    if (node.tagName === 'VIDEO') {
      node.pause();
      node.removeAttribute('src');
      node.load();
    }
    node.remove();
}

function clearStage() {
  stage.querySelectorAll('.lightbox-media').forEach(cleanupMedia);
}

function createMedia(item, direction) {
  const media = document.createElement(item.type === 'video' ? 'video' : 'img');
  media.className = `lightbox-media lightbox-media-enter-${direction}`;
  media.addEventListener('error', () => showError(item, media.error), { once: true });
  media.src = item.src;

  if (item.type === 'video') {
    media.controls = true;
    media.playsInline = true;
    media.preload = 'metadata';
    const playback = media.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch((error) => {
        // Autoplay can be blocked by the browser; controls remain available.
        console.warn(`gallery.js: autoplay blocked for "${item.src}"`, error);
      });
    }
  } else {
    media.alt = '';
    media.decoding = 'async';
  }

  return media;
}

function preloadNearbyImages() {
  [-1, 1].forEach((offset) => {
    const item = galleryItems[(currentIndex + offset + galleryItems.length) % galleryItems.length];
    if (!item || item.type !== 'image') return;
    const image = new Image();
    image.addEventListener('error', () => {
      console.warn(`gallery.js: preload failed for "${item.src}"`);
    }, { once: true });
    image.src = item.src;
  });
}

function renderMedia(direction = 'next') {
  if (!galleryItems.length) return;

  clearError();

  const outgoingMedia = [...stage.querySelectorAll('.lightbox-media')];
  const media = createMedia(galleryItems[currentIndex], direction);

  outgoingMedia.forEach((node) => {
    if (node.tagName === 'VIDEO') node.pause();
    node.classList.remove('is-active');
    node.classList.add(`lightbox-media-exit-${direction}`);
    window.setTimeout(() => cleanupMedia(node), 280);
  });

  stage.append(media);
  preloadNearbyImages();

  window.requestAnimationFrame(() => {
    media.classList.add('is-active');
  });
}

function goToIndex(index, direction) {
  currentIndex = (index + galleryItems.length) % galleryItems.length;
  renderMedia(direction);
}

function showPrevious() {
  goToIndex(currentIndex - 1, 'previous');
}

function showNext() {
  goToIndex(currentIndex + 1, 'next');
}

function openLightbox(index) {
  if (!galleryItems[index]) return;

  currentIndex = index;
  lastFocusedTrigger = galleryItems[index].trigger;
  renderMedia('next');
  lightbox.classList.add('show');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  closeButton.focus({ preventScroll: true });
}

function closeLightbox() {
  clearStage();
  clearError();
  lightbox.classList.remove('show');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');

  if (lastFocusedTrigger) {
    lastFocusedTrigger.focus({ preventScroll: true });
  }
}

document.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('.media-item')) return;
  console.error(`gallery.js: thumbnail failed to load "${target.getAttribute('src')}"`);
  target.closest('.media-item').classList.add('media-item-broken');
}, true);

galleryItems.forEach((item, index) => {
  item.trigger.addEventListener('click', () => {
    openLightbox(index);
  });
});

closeButton.addEventListener('click', closeLightbox);
previousButton.addEventListener('click', showPrevious);
nextButton.addEventListener('click', showNext);

lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox || event.target === stage) closeLightbox();
});

stage.addEventListener('pointerdown', (event) => {
  if (!isLightboxOpen()) return;

  isPointerDown = true;
  touchStartX = event.clientX;
  touchStartY = event.clientY;
  touchDeltaX = 0;
  touchDeltaY = 0;

  try {
    stage.setPointerCapture(event.pointerId);
  } catch (error) {
    console.warn('gallery.js: could not capture pointer, swipe may be interrupted', error);
  }
});

stage.addEventListener('pointermove', (event) => {
  if (!isPointerDown) return;

  touchDeltaX = event.clientX - touchStartX;
  touchDeltaY = event.clientY - touchStartY;
});

stage.addEventListener('pointerup', (event) => {
  if (!isPointerDown) return;

  isPointerDown = false;

  try {
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.warn('gallery.js: could not release pointer capture', error);
  }

  const isHorizontalSwipe = Math.abs(touchDeltaX) > 50 && Math.abs(touchDeltaX) > Math.abs(touchDeltaY) * 1.2;
  if (!isHorizontalSwipe) return;

  if (touchDeltaX > 0) {
    showPrevious();
  } else {
    showNext();
  }
});

stage.addEventListener('pointercancel', () => {
  isPointerDown = false;
});

window.addEventListener('keydown', (event) => {
  if (!isLightboxOpen()) return;

  if (event.key === 'Escape') {
    closeLightbox();
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    showPrevious();
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    showNext();
  }
});
