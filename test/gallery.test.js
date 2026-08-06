import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGalleryDom, dispatchPointer, loadGallery, pressKey } from './helpers.js';

const IMAGES = [
  { type: 'image', src: 'assets/creative/a.jpg' },
  { type: 'image', src: 'assets/creative/b.jpg' },
  { type: 'video', src: 'assets/videography/c.mp4' },
  { type: 'image', src: 'assets/portre/d.jpg' },
];

const lightbox = () => document.getElementById('lightbox');
const stage = () => document.querySelector('.lightbox-stage');
const mediaNodes = () => [...stage().querySelectorAll('.lightbox-media')];
const activeMedia = () => stage().querySelector('.lightbox-media.is-active');
const items = () => [...document.querySelectorAll('.media-item')];

beforeEach(() => {
  // gallery.js relies on requestAnimationFrame to promote media to `is-active`
  // and on Pointer capture APIs that jsdom does not implement.
  vi.stubGlobal('requestAnimationFrame', (cb) => cb());
  window.requestAnimationFrame = (cb) => cb();
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  // jsdom does not implement media playback; stub to keep output clean.
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('gallery.js initialization', () => {
  it('creates the stage and navigation arrows inside the lightbox', async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();

    expect(stage()).not.toBeNull();
    expect(lightbox().querySelector('.lightbox-arrow-previous')).not.toBeNull();
    expect(lightbox().querySelector('.lightbox-arrow-next')).not.toBeNull();
    expect(lightbox().querySelector('.lightbox-arrow-previous').getAttribute('aria-label')).toBe(
      'Onceki calisma',
    );
  });

  it('loads without a lightbox open and with no media rendered', async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();

    expect(lightbox().classList.contains('show')).toBe(false);
    expect(mediaNodes()).toHaveLength(0);
  });
});

describe('opening the lightbox', () => {
  beforeEach(async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();
  });

  it('opens on the clicked item and marks it active', () => {
    items()[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(lightbox().classList.contains('show')).toBe(true);
    expect(lightbox().getAttribute('aria-hidden')).toBe('false');
    expect(document.body.classList.contains('lightbox-open')).toBe(true);
    expect(activeMedia().getAttribute('src')).toBe('assets/creative/b.jpg');
  });

  it('renders an <img> for image items with async decoding', () => {
    items()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const media = activeMedia();
    expect(media.tagName).toBe('IMG');
    expect(media.decoding).toBe('async');
    expect(media.alt).toBe('');
  });

  it('renders a controllable, inline <video> for video items', () => {
    items()[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const media = activeMedia();
    expect(media.tagName).toBe('VIDEO');
    expect(media.controls).toBe(true);
    expect(media.autoplay).toBe(true);
    expect(media.playsInline).toBe(true);
  });
});

describe('navigation', () => {
  beforeEach(async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();
    items()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  it('advances to the next item with the next arrow', () => {
    lightbox().querySelector('.lightbox-arrow-next').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );

    expect(activeMedia().getAttribute('src')).toBe('assets/creative/b.jpg');
  });

  it('wraps from the first item to the last with the previous arrow', () => {
    lightbox().querySelector('.lightbox-arrow-previous').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );

    // last item (index 3) is an image
    expect(activeMedia().getAttribute('src')).toBe('assets/portre/d.jpg');
  });

  it('wraps from the last item back to the first with the next arrow', () => {
    const next = lightbox().querySelector('.lightbox-arrow-next');
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // -> 1
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // -> 2
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // -> 3
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // -> 0

    expect(activeMedia().getAttribute('src')).toBe('assets/creative/a.jpg');
  });
});

describe('keyboard controls', () => {
  beforeEach(async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();
  });

  it('ignores keyboard input while the lightbox is closed', () => {
    pressKey('ArrowRight');
    expect(mediaNodes()).toHaveLength(0);
    expect(lightbox().classList.contains('show')).toBe(false);
  });

  it('navigates with ArrowRight and ArrowLeft while open', () => {
    items()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    pressKey('ArrowRight');
    expect(activeMedia().getAttribute('src')).toBe('assets/creative/b.jpg');

    pressKey('ArrowLeft');
    expect(activeMedia().getAttribute('src')).toBe('assets/creative/a.jpg');
  });

  it('closes on Escape and restores focus to the opening trigger', () => {
    items()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    pressKey('Escape');

    expect(lightbox().classList.contains('show')).toBe(false);
    expect(lightbox().getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('lightbox-open')).toBe(false);
    expect(document.activeElement).toBe(items()[0]);
  });
});

describe('closing via backdrop', () => {
  beforeEach(async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();
    items()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  it('closes when clicking the lightbox backdrop', () => {
    lightbox().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(lightbox().classList.contains('show')).toBe(false);
  });

  it('closes when clicking the stage itself and clears rendered media', () => {
    stage().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(lightbox().classList.contains('show')).toBe(false);
    expect(mediaNodes()).toHaveLength(0);
  });

  it('closes with the dedicated close button', () => {
    lightbox().querySelector('.lightbox-close').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );
    expect(lightbox().classList.contains('show')).toBe(false);
  });
});

describe('swipe gestures', () => {
  beforeEach(async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();
    items()[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  it('advances on a leftward horizontal swipe', () => {
    dispatchPointer(stage(), 'pointerdown', { clientX: 200, clientY: 100 });
    dispatchPointer(stage(), 'pointermove', { clientX: 120, clientY: 105 });
    dispatchPointer(stage(), 'pointerup', { clientX: 120, clientY: 105 });

    expect(activeMedia().tagName).toBe('VIDEO'); // index 2 is the video
  });

  it('goes back on a rightward horizontal swipe', () => {
    dispatchPointer(stage(), 'pointerdown', { clientX: 120, clientY: 100 });
    dispatchPointer(stage(), 'pointermove', { clientX: 220, clientY: 105 });
    dispatchPointer(stage(), 'pointerup', { clientX: 220, clientY: 105 });

    expect(activeMedia().getAttribute('src')).toBe('assets/creative/a.jpg'); // index 0
  });

  it('ignores mostly-vertical drags', () => {
    dispatchPointer(stage(), 'pointerdown', { clientX: 100, clientY: 100 });
    dispatchPointer(stage(), 'pointermove', { clientX: 110, clientY: 260 });
    dispatchPointer(stage(), 'pointerup', { clientX: 110, clientY: 260 });

    expect(activeMedia().getAttribute('src')).toBe('assets/creative/b.jpg'); // still index 1
  });

  it('ignores a swipe that is cancelled mid-gesture', () => {
    dispatchPointer(stage(), 'pointerdown', { clientX: 200, clientY: 100 });
    dispatchPointer(stage(), 'pointermove', { clientX: 120, clientY: 100 });
    dispatchPointer(stage(), 'pointercancel', { clientX: 120, clientY: 100 });
    dispatchPointer(stage(), 'pointerup', { clientX: 120, clientY: 100 });

    expect(activeMedia().getAttribute('src')).toBe('assets/creative/b.jpg'); // unchanged
  });
});

describe('pointer guards', () => {
  beforeEach(async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();
  });

  it('ignores pointer gestures while the lightbox is closed', () => {
    dispatchPointer(stage(), 'pointerdown', { clientX: 200, clientY: 100 });
    dispatchPointer(stage(), 'pointermove', { clientX: 120, clientY: 100 });
    dispatchPointer(stage(), 'pointerup', { clientX: 120, clientY: 100 });

    expect(lightbox().classList.contains('show')).toBe(false);
    expect(mediaNodes()).toHaveLength(0);
  });

  it('ignores pointer movement that starts without a pointerdown', () => {
    items()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // move + up without a preceding pointerdown must not navigate
    dispatchPointer(stage(), 'pointermove', { clientX: 300, clientY: 100 });
    dispatchPointer(stage(), 'pointerup', { clientX: 300, clientY: 100 });

    expect(activeMedia().getAttribute('src')).toBe('assets/creative/a.jpg');
  });
});

describe('media transitions and cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('removes the outgoing media after the transition and pauses outgoing video', async () => {
    buildGalleryDom(IMAGES);
    await loadGallery();

    // open on the video (index 2) so the outgoing node is a <video>
    items()[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const outgoingVideo = activeMedia();
    const pauseSpy = vi.spyOn(outgoingVideo, 'pause');

    lightbox().querySelector('.lightbox-arrow-next').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );

    // during the transition both nodes coexist
    expect(mediaNodes().length).toBe(2);
    expect(pauseSpy).toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    // outgoing node is cleaned up, leaving only the new active media
    expect(mediaNodes().length).toBe(1);
    expect(outgoingVideo.isConnected).toBe(false);
  });
});

describe('empty gallery', () => {
  it('does nothing when there are no media items', async () => {
    document.body.innerHTML = `
      <section class="masonry"></section>
      <div class="lightbox" id="lightbox" aria-hidden="true" role="dialog">
        <button class="lightbox-close" type="button">&times;</button>
      </div>
    `;
    await loadGallery();

    // renderMedia returns early; nothing should render even if navigation fires
    pressKey('ArrowRight');
    expect(mediaNodes()).toHaveLength(0);
  });
});
