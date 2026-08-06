/* Shared browser helpers used by index.html and the generated gallery pages. */
window.site = (function () {
  function onEscape(handler) {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') handler(event);
    });
  }

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function enableSmoothAnchorScroll(root = document, { skip = () => false, delay = 0, onNavigate } = {}) {
    root.addEventListener('click', (event) => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor || skip(anchor) || !document.getElementById(anchor.getAttribute('href').slice(1))) return;

      event.preventDefault();
      const id = anchor.getAttribute('href').slice(1);
      if (onNavigate) onNavigate(anchor);
      if (delay) {
        window.setTimeout(() => scrollToId(id), delay);
      } else {
        scrollToId(id);
      }
    });
  }

  return { onEscape, scrollToId, enableSmoothAnchorScroll };
})();
