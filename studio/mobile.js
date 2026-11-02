// Responsive navigation only. No authentication, API requests or data writes.
(() => {
  'use strict';
  const dashboard = document.getElementById('dashboard');
  const sidebar = document.getElementById('studio-sidebar');
  const toggle = document.getElementById('studio-menu-toggle');
  const closeButton = document.getElementById('studio-menu-close');
  const backdrop = document.getElementById('studio-menu-backdrop');
  const main = document.querySelector('.og-main');
  const current = document.getElementById('studio-current-section');
  if (!dashboard || !sidebar || !toggle || !closeButton || !backdrop || !main) return;
  const media = window.matchMedia('(max-width:900px)');
  let open = false;
  let previousFocus = null;
  const focusables = () => Array.from(sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
  function setOpen(next, restoreFocus = true) {
    const wasOpen = open;
    open = !!next && media.matches && !dashboard.hidden;
    if (open && !wasOpen) previousFocus = document.activeElement;
    dashboard.classList.toggle('menu-open', open);
    document.body.classList.toggle('studio-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú de Studio' : 'Abrir menú de Studio');
    backdrop.hidden = !open;
    main.inert = open;
    sidebar.inert = media.matches && !open;
    if (media.matches) sidebar.setAttribute('aria-hidden', String(!open));
    else sidebar.removeAttribute('aria-hidden');
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      closeButton.focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      if (wasOpen && restoreFocus && !dashboard.hidden) {
        const target = media.matches ? toggle : (previousFocus?.isConnected && previousFocus.getClientRects().length ? previousFocus : sidebar.querySelector('.og-nav-item.active'));
        if (target && target.getClientRects().length) target.focus();
      }
    }
  }
  toggle.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', event => {
    if (event.target.closest('.og-nav-item[data-tab], #sign-out, .og-brand')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (event.key !== 'Tab') return;
    const items = focusables();
    const first = items[0], last = items[items.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  document.addEventListener('studio:tabchange', event => {
    const tab = event.detail?.tab;
    const button = Array.from(sidebar.querySelectorAll('[data-tab]')).find(el => el.dataset.tab === tab);
    const label = button?.querySelector('.label')?.textContent;
    if (current && label) current.textContent = label;
    setOpen(false);
  });
  media.addEventListener('change', () => setOpen(false));
  new MutationObserver(() => { if (dashboard.hidden) setOpen(false, false); }).observe(dashboard, { attributes:true, attributeFilter:['hidden'] });
  window.addEventListener('pageshow', () => setOpen(false, false));
  setOpen(false, false);
})();
