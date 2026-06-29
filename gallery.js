const lightbox = document.getElementById('lightbox');
const closeButton = lightbox.querySelector('.lightbox-close');
const mediaButtons = [...document.querySelectorAll('.media-item')];
const galleryItems = mediaButtons.map((item) => ({
  type: item.dataset.type,
  src: item.dataset.src,
  trigger: item,
}));

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

lightbox.append(stage, previousButton, nextButton);

let currentIndex = 0;
let lastFocusedTrigger = null;
let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
let touchDeltaY = 0;
let isPointerDown = false;

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
  media.src = item.src;

  if (item.type === 'video') {
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
    media.preload = 'metadata';
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
    image.src = item.src;
  });
}

function renderMedia(direction = 'next') {
  if (!galleryItems.length) return;

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
  lightbox.classList.remove('show');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');

  if (lastFocusedTrigger) {
    lastFocusedTrigger.focus({ preventScroll: true });
  }
}

mediaButtons.forEach((item, index) => {
  item.addEventListener('click', () => {
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
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener('pointermove', (event) => {
  if (!isPointerDown) return;

  touchDeltaX = event.clientX - touchStartX;
  touchDeltaY = event.clientY - touchStartY;
});

stage.addEventListener('pointerup', (event) => {
  if (!isPointerDown) return;

  isPointerDown = false;
  stage.releasePointerCapture(event.pointerId);

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
