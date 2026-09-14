/* OPEN GRAIN — notch arriba → DERECHA. JavaScript nativo, sin dependencias.
   Cargar ANTES de main.js; sustituye a renderNav().
   El destino es el borde derecho, donde vivía el dock antiguo. */
(() => {
  'use strict';
  const instances = new WeakMap();
  let serial = 0;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const paths = {
    home: 'M3 10.5 12 3l9 7.5 M5.5 9.5V21h13V9.5',
    work: 'M3 4h18v16H3z M3 15l5-4 4 3 3-2 6 4',
    services: 'M12 3 3 8l9 5 9-5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
    studio: 'M3 7h5l2-3h4l2 3h5v13H3z M8 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
    contact: 'M3 5h18v14H3z M3 5l9 7 9-7',
    lang: 'M3 12h18 M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18 M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',
    theme: 'M20 14a8 8 0 0 1-10-10 9 9 0 1 0 10 10'
  };
  const icon = (key) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '18'); svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[key] || paths.work); svg.append(path); return svg;
  };
  const normalize = (path) => path.replace(/\/$/, '').replace(/\/index(?:\.html)?$/, '').replace(/\.html$/, '') || '/';
  const safeHref = (value) => {
    try {
      const url = new URL(value, location.href);
      if (typeof value === 'string' && value.startsWith('#')) return url.href;
      return url.origin === location.origin && /^https?:$/.test(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  class Notch {
    constructor(root, options) {
      this.root = root;
      this.abort = new AbortController();
      this.signal = this.abort.signal;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.hover = matchMedia('(hover: hover) and (pointer: fine)');
      this.edge = scrollY > 120 ? 'right' : 'top';
      this.target = this.edge;
      this.opened = false;
      this.keyboardMode = false;
      this.version = 0;
      this.timer = 0;
      this.raf = 0;
      this.flight = null;
      this.rows = [];
      root.replaceChildren();
      root.classList.add('og-notch');
      root.classList.remove('dynamic-island', 'expanded', 'is-bottom');
      root.style.removeProperty('transition');
      root.dataset.edge = this.edge;
      this.toggle = el('button', 'og-notch-toggle');
      this.toggle.type = 'button';
      this.toggle.setAttribute('aria-expanded', 'false');
      const icon = el('span', 'og-notch-grip', '•••');
      icon.setAttribute('aria-hidden', 'true');
      this.label = el('span', 'og-notch-label');
      this.toggle.append(icon, this.label);
      this.panel = el('div', 'og-notch-panel');
      this.panel.id = `og-notch-panel-${++serial}`;
      this.panel.hidden = true;
      this.panel.inert = true;
      this.toggle.setAttribute('aria-controls', this.panel.id);
      this.probe = el('span', 'og-notch-safe-area');
      this.probe.setAttribute('aria-hidden', 'true');
      root.append(this.toggle, this.panel, this.probe);
      this.update(options);
      this.place();
      this.listen(this.toggle, 'click', () => {
        // Con ratón, el panel ya se ha abierto solo al entrar el cursor. Si el
        // clic se limitara a alternar, abriría y cerraría en el mismo gesto:
        // el primer clic sobre un panel abierto por hover lo fija, no lo cierra.
        const next = this.opened && !this.openedByHover ? false : true;
        this.openedByHover = false;
        this.settle();
        this.setOpen(next);
      });
      this.listen(root, 'pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !this.hover.matches || this.moving) return;
        clearTimeout(this.timer);
        if (!this.opened) this.openedByHover = true;
        this.setOpen(true);
      });
      this.listen(root, 'pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        this.timer = setTimeout(() => {
          if (!root.contains(document.activeElement)) this.setOpen(false);
        }, 220);
      });
      this.listen(root, 'focusout', (event) => {
        if (event.relatedTarget && root.contains(event.relatedTarget)) return;
        setTimeout(() => {
          if (!root.contains(document.activeElement)) {
            this.setOpen(false);
            this.move();
          }
        }, 0);
      });
      this.listen(document, 'pointerdown', (e) => {
        this.keyboardMode = false;
        if (!root.contains(e.target)) this.setOpen(false);
      });
      this.listen(document, 'keydown', (e) => {
        this.keyboardMode = true;
        if (e.key === 'Escape' && this.opened) {
          e.preventDefault();
          this.setOpen(false, true);
        }
      });
      this.listen(root, 'click', (e) => {
        if (e.target.closest('a.og-notch-item')) this.setOpen(false);
        // Language/theme buttons keep data-action; the existing delegated
        // handler in main.js remains responsible for those two actions.
      });
      this.listen(window, 'scroll', () => {
        if (this.raf) return;
        this.raf = requestAnimationFrame(() => {
          this.raf = 0;
          if (scrollY > 120) this.target = 'right';
          else if (scrollY < 48) this.target = 'top';
          this.move();
        });
      }, { passive: true });
      this.listen(window, 'resize', () => this.settle(), { passive: true });
      this.listen(window, 'pageshow', () => {
        this.target = scrollY > 120 ? 'right' : 'top';
        this.settle();
      });
      if (window.visualViewport) {
        this.listen(visualViewport, 'resize', () => this.settle(), { passive: true });
        this.listen(visualViewport, 'scroll', () => this.settle(), { passive: true });
      }
      this.listen(this.reduced, 'change', () => this.settle());
    }
    listen(target, event, fn, options = {}) {
      target.addEventListener(event, fn, { ...options, signal: this.signal });
    }
    update(options) {
      this.options = options;
      const es = options.lang === 'es';
      this.root.setAttribute('aria-label', es ? 'Navegación principal' : 'Primary navigation');
      this.label.textContent = es ? 'Menú' : 'Menu';
      this.toggle.setAttribute('aria-label', es ? 'Abrir o cerrar menú' : 'Open or close menu');
      const entries = (options.items || []).map(item => ({ ...item, key: item.key || item.href }));
      entries.push({ key: 'lang', action: 'lang', label: es ? 'Español · EN' : 'English · ES' });
      entries.push({ key: 'theme', action: 'theme', label: es
        ? (options.dark ? 'Tema claro' : 'Tema oscuro')
        : (options.dark ? 'Light theme' : 'Dark theme') });
      // Update existing nodes instead of resetting innerHTML: keep focus and
      // expansion when main.js re-renders for a language/theme change.
      const signature = entries.map(x => x.key).join('|');
      if (signature !== this.signature) {
        const focusKey = document.activeElement?.dataset?.ogKey;
        this.rows = entries.map(item => {
          const row = el(item.action ? 'button' : 'a', 'og-notch-item');
          row.dataset.ogKey = item.key;
          if (item.action) {
            row.type = 'button';
            row.dataset.action = item.action;
          }
          const text = el('span', 'og-notch-item-text');
          row.append(icon(item.key), text);
          return { node: row, text, key: item.key };
        });
        this.panel.replaceChildren(...this.rows.map(x => x.node));
        this.signature = signature;
        this.rows.find(x => x.key === focusKey)?.node.focus({ preventScroll: true });
      }
      entries.forEach((item, index) => {
        const { node, text } = this.rows[index];
        text.textContent = item.label;
        node.removeAttribute('aria-current');
        if (!item.action) {
          const href = safeHref(item.href);
          if (href) node.href = href;
          else node.removeAttribute('href');
          if (href && !new URL(href).hash && normalize(new URL(href).pathname) === normalize(location.pathname)) {
            node.setAttribute('aria-current', 'page');
          }
          node.classList.toggle('og-notch-contact', item.key === 'contact');
        }
      });
    }
    coordinates(edge) {
      // Los insets reales de safe-area se leen de la sonda invisible, no se
      // suponen: en un iPhone apaisado el lado derecho tiene muesca.
      const css = getComputedStyle(this.probe);
      const top = parseFloat(css.paddingTop) || 0;
      const right = parseFloat(css.paddingRight) || 0;
      const vv = window.visualViewport;
      const width = vv?.width || innerWidth;
      const height = vv?.height || innerHeight;
      const ox = vv?.offsetLeft || 0;
      const oy = vv?.offsetTop || 0;
      const size = 48; // el lienzo del notch, el mismo que fija la CSS
      const x = edge === 'top' ? ox + width / 2 - 24 : ox + width - right - size;
      const y = edge === 'top' ? oy + top : oy + Math.max(top + 36, height / 2 - 24);
      return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }
    place() { this.root.style.transform = this.coordinates(this.edge); }
    setOpen(value, returnFocus = false) {
      clearTimeout(this.timer);
      if (!value) this.openedByHover = false;
      this.opened = Boolean(value);
      this.toggle.setAttribute('aria-expanded', String(this.opened));
      this.panel.hidden = !this.opened;
      this.panel.inert = !this.opened;
      this.root.classList.toggle('og-is-open', this.opened);
      if (returnFocus) this.toggle.focus({ preventScroll: true });
    }
    settle() {
      this.version++;
      this.flight?.cancel();
      this.flight = null;
      this.moving = false;
      this.edge = this.target;
      this.root.dataset.edge = this.edge;
      this.root.classList.remove('og-is-travelling');
      this.place();
    }
    async move() {
      if (this.moving || this.edge === this.target) return;
      // Never move a navigation control out from under a keyboard user.
      if (this.keyboardMode && this.root.contains(document.activeElement)) return;
      if (this.reduced.matches || !this.root.animate) { this.settle(); return; }
      this.setOpen(false);
      this.moving = true;
      const version = ++this.version;
      const destination = this.target;
      this.root.classList.add('og-is-travelling');
      await new Promise(resolve => setTimeout(resolve, 150));
      if (version !== this.version) return;
      const next = this.coordinates(destination);
      this.flight = this.root.animate([
        { transform: this.root.style.transform }, { transform: next }
      ], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      try { await this.flight.finished; } catch { return; }
      if (version !== this.version) return;
      this.root.style.transform = next;
      this.flight.cancel();
      this.flight = null;
      this.edge = destination;
      this.root.dataset.edge = destination;
      this.root.classList.remove('og-is-travelling');
      this.moving = false;
      if (this.edge !== this.target) this.move();
    }
    destroy() {
      this.abort.abort();
      this.settle();
      clearTimeout(this.timer);
      cancelAnimationFrame(this.raf);
      instances.delete(this.root);
    }
  }
  window.OGNotch = Object.freeze({
    mount(root, options) {
      if (!(root instanceof HTMLElement)) throw new TypeError('OGNotch: root element required.');
      let instance = instances.get(root);
      if (!instance) { instance = new Notch(root, options); instances.set(root, instance); }
      else instance.update(options);
      return instance;
    }
  });
})();
