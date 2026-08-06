document.getElementById('y').textContent = new Date().getFullYear();

const logoBtn = document.getElementById('logoBtn');
const overlay = document.getElementById('navOverlay');

function closeOverlay() {
  overlay.setAttribute('hidden', '');
  logoBtn.setAttribute('aria-expanded', 'false');
}

function openOverlay() {
  overlay.removeAttribute('hidden');
  logoBtn.setAttribute('aria-expanded', 'true');
}

logoBtn.addEventListener('click', () => {
  overlay.hasAttribute('hidden') ? openOverlay() : closeOverlay();
});

overlay.addEventListener('click', (event) => {
  if (event.target === overlay) closeOverlay();
});

window.addEventListener('scroll', () => {
  if (!overlay.hasAttribute('hidden')) closeOverlay();
}, { passive: true });

site.onEscape(closeOverlay);

site.enableSmoothAnchorScroll(overlay, { delay: 60, onNavigate: closeOverlay });
site.enableSmoothAnchorScroll(document, { skip: (anchor) => anchor.closest('#navOverlay') !== null });
