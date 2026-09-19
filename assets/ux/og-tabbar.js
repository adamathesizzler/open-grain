/* OPEN GRAIN — barra de navegación inferior, estilo Pinterest.
   JavaScript nativo, sin dependencias. Sustituye al notch (og-notch.js).

   Una cápsula oscura, abajo y centrada, con las cinco páginas en iconos. Está
   siempre ahí mientras se desliza: no se mueve, no se abre, no tapa nada que
   importe. Sólo se aparta en pantallas táctiles mientras se escribe en un
   campo, porque ahí el teclado ya ocupa media pantalla.

   API (la misma forma que tenía el notch, para que main.js cambie poco):
     OGTabbar.mount(elemento, { lang, items: [{ key, href, label }] })
   Llamarlo otra vez con otro idioma actualiza los textos sin rehacer el DOM,
   así no se pierde el foco. */
(() => {
  'use strict';
  const instances = new WeakMap();
  const SVG = 'http://www.w3.org/2000/svg';
  const paths = {
    home: 'M3.5 10.5 12 3.5l8.5 7 M5.5 9v11.5h13V9',
    work: 'M3.5 4.5h17v15h-17z M3.5 15l5-4 4 3 3-2 5 3.5',
    services: 'M12 3.5 3.5 8l8.5 4.5L20.5 8z M3.5 12l8.5 4.5 8.5-4.5 M3.5 16l8.5 4.5 8.5-4.5',
    studio: 'M3.5 7.5h4.5l2-3h4l2 3h4.5v12h-17z M8.5 13.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0',
    contact: 'M3.5 5.5h17v13h-17z M3.5 6l8.5 7 8.5-7',
  };
  const icon = (key) => {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7'); svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', paths[key] || paths.work);
    svg.append(path);
    return svg;
  };
  // /work, /work.html y /work/ son la misma página.
  const normalize = (p) => p.replace(/\/$/, '').replace(/\/index(?:\.html)?$/, '').replace(/\.html$/, '') || '/';
  const isField = (el) => !!el && el.matches &&
    el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, select, [contenteditable="true"]');

  class TabBar {
    constructor(root, options) {
      this.root = root;
      this.abort = new AbortController();
      const signal = this.abort.signal;
      this.touch = matchMedia('(pointer: coarse)');

      root.replaceChildren();
      root.classList.add('og-tabbar');
      this.list = document.createElement('ul');
      this.list.className = 'og-tabbar-list';
      root.append(this.list);

      // Mientras se escribe en un móvil, la barra se aparta del teclado.
      document.addEventListener('focusin', (e) => {
        if (this.touch.matches && isField(e.target)) root.classList.add('og-tabbar-away');
      }, { signal });
      document.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!isField(document.activeElement)) root.classList.remove('og-tabbar-away');
        }, 0);
      }, { signal });

      // Hueco que ocupa la barra, para que el aviso de cookies y el final de
      // cada página queden por encima y no debajo de ella.
      const measure = () => {
        const footer = document.querySelector('.home-footer');
        if (footer) document.documentElement.style.setProperty('--og-home-footer', `${Math.round(footer.offsetHeight)}px`);
        requestAnimationFrame(() => {
          const r = root.getBoundingClientRect();
          if (r.height) {
            document.documentElement.style.setProperty('--og-bar-space', `${Math.max(0, Math.round(window.innerHeight - r.top))}px`);
          }
        });
      };
      this.measure = measure;
      window.addEventListener('resize', measure, { passive: true, signal });
      window.addEventListener('load', measure, { signal });

      this.update(options);
      measure();
    }

    update(options) {
      const es = options.lang === 'es';
      this.root.setAttribute('aria-label', es ? 'Navegación principal' : 'Primary navigation');
      const items = options.items || [];
      const signature = items.map(i => i.key).join('|');
      if (signature !== this.signature) {
        const focusKey = document.activeElement?.dataset?.ogKey;
        this.links = items.map(item => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.className = 'og-tab';
          a.dataset.ogKey = item.key;
          const tip = document.createElement('span');
          tip.className = 'og-tab-tip';
          tip.setAttribute('aria-hidden', 'true');
          const mark = document.createElement('span');
          mark.className = 'og-tab-icon';
          mark.append(icon(item.key));
          a.append(mark, tip);
          li.append(a);
          return { li, a, tip };
        });
        this.list.replaceChildren(...this.links.map(x => x.li));
        this.signature = signature;
        this.links.find(x => x.a.dataset.ogKey === focusKey)?.a.focus({ preventScroll: true });
      }
      const here = normalize(location.pathname);
      items.forEach((item, i) => {
        const { a, tip } = this.links[i];
        a.href = item.href;
        // Sólo icono, como en Pinterest: el nombre lo lee el lector de
        // pantalla y aparece como etiqueta al pasar el ratón o con el teclado.
        a.setAttribute('aria-label', item.label);
        tip.textContent = item.label;
        a.classList.toggle('og-tab-contact', item.key === 'contact');
        const url = new URL(item.href, location.href);
        if (normalize(url.pathname) === here) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      this.measure?.();
    }

    destroy() {
      this.abort.abort();
      instances.delete(this.root);
    }
  }

  window.OGTabbar = Object.freeze({
    mount(root, options) {
      if (!(root instanceof HTMLElement)) throw new TypeError('OGTabbar: root element required.');
      let instance = instances.get(root);
      if (!instance) { instance = new TabBar(root, options); instances.set(root, instance); }
      else instance.update(options);
      return instance;
    },
  });
})();
