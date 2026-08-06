import { vi } from 'vitest';

const CATEGORIES = ['creative', 'etkinlik', 'portre', 'sinema', 'videography'];

/**
 * Build the DOM structure that gallery.js expects for a gallery archive page:
 * a `.masonry` list of `.media-item` buttons plus the `#lightbox` container.
 *
 * @param {Array<{type?: string, src?: string}>} items media descriptors
 */
export function buildGalleryDom(items) {
  const buttons = items
    .map((item, index) => {
      const type = item.type ?? 'image';
      const src = item.src ?? `assets/${CATEGORIES[index % CATEGORIES.length]}/${index}.jpg`;
      return `<button class="media-item" type="button" data-type="${type}" data-src="${src}"></button>`;
    })
    .join('');

  document.body.innerHTML = `
    <section class="masonry">${buttons}</section>
    <div class="lightbox" id="lightbox" aria-hidden="true" role="dialog">
      <button class="lightbox-close" type="button" aria-label="Kapat">&times;</button>
    </div>
  `;
}

/**
 * (Re)load gallery.js against the current document so each test exercises a
 * fresh evaluation of the module's top-level code.
 */
export async function loadGallery() {
  vi.resetModules();
  await import('../gallery.js');
}

/**
 * Dispatch a pointer-like event with coordinates, since jsdom does not provide
 * a full PointerEvent constructor.
 */
export function dispatchPointer(target, type, { clientX = 0, clientY = 0, pointerId = 1 } = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX, clientY, pointerId });
  target.dispatchEvent(event);
  return event;
}

/** Dispatch a keydown on window with the given key. */
export function pressKey(key) {
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  window.dispatchEvent(event);
  return event;
}
