/* OPEN GRAIN — barra de navegación inferior, estilo Pinterest.
   JavaScript nativo, sin dependencias. Sustituye al notch (og-notch.js).

   Una cápsula oscura, abajo y centrada, con las cinco páginas en iconos.

   - Con ratón (ordenador): recogida en una pastilla pequeña, como la rayita
     de abajo del iPhone. Al acercar el ratón o llegar con el teclado se
     despliega entera, y se recoge sola al apartarse. La primera vez de cada
     visita se enseña desplegada un momento, para que se sepa que está ahí.
   - Táctil (móvil, tablet): completa. Se esconde mientras se baja y vuelve en
     cuanto se sube un poco; siempre visible arriba del todo y al final de la
     página. También se aparta del teclado mientras se escribe en un campo.

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
      // El fondo es una capa aparte: así puede encogerse hasta la pastilla y
      // volver a crecer sin deformar los iconos ni perder la sombra.
      this.bg = document.createElement('span');
      this.bg.className = 'og-tabbar-bg';
      this.bg.setAttribute('aria-hidden', 'true');
      this.handle = document.createElement('span');
      this.handle.className = 'og-tabbar-handle';
      this.handle.setAttribute('aria-hidden', 'true');
      this.list = document.createElement('ul');
      this.list.className = 'og-tabbar-list';
      root.append(this.bg, this.handle, this.list);

      this.fine = matchMedia('(hover: hover) and (pointer: fine)');
      this.setupPointer(signal);
      this.setupScroll(signal);

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

    // ---------- Ordenador: pastilla que se despliega ----------
    setupPointer(signal) {
      const root = this.root;
      let timer = 0;
      let raf = 0;
      let px = -1, py = -1;
      const collapse = (value) => root.classList.toggle('og-tabbar-collapsed', value);
      const isOpen = () => !root.classList.contains('og-tabbar-collapsed');
      const near = () => {
        // Recogida: la zona es la pastilla y un margen generoso alrededor.
        // Desplegada: la barra entera y un margen, para que no se cierre al
        // moverse entre iconos.
        const r = (isOpen() ? root : this.bg).getBoundingClientRect();
        const mx = isOpen() ? 16 : 26, my = isOpen() ? 16 : 18;
        return px >= r.left - mx && px <= r.right + mx && py >= r.top - my && py <= r.bottom + my;
      };
      const check = () => {
        raf = 0;
        if (!this.fine.matches) return;
        if (near() || root.contains(document.activeElement)) {
          clearTimeout(timer); timer = 0;
          collapse(false);
        } else if (isOpen() && !timer && !this.peeking) {
          timer = setTimeout(() => {
            timer = 0;
            if (!near() && !root.contains(document.activeElement)) collapse(true);
          }, 380);
        }
      };
      const apply = () => {
        clearTimeout(timer); timer = 0;
        if (!this.fine.matches) { collapse(false); return; }
        // Primer vistazo de la visita: desplegada un momento y luego se recoge.
        let seen = false;
        try { seen = sessionStorage.getItem('og_bar_seen') === '1'; sessionStorage.setItem('og_bar_seen', '1'); } catch (e) { seen = true; }
        if (seen) { collapse(true); return; }
        collapse(false);
        this.peeking = true;
        setTimeout(() => { this.peeking = false; check(); }, 1800);
      };
      document.addEventListener('mousemove', (e) => {
        px = e.clientX; py = e.clientY;
        if (!raf) raf = requestAnimationFrame(check);
      }, { passive: true, signal });
      document.documentElement.addEventListener('mouseleave', () => { px = py = -1; check(); }, { signal });
      // Con el teclado se despliega al entrar y se recoge al salir.
      root.addEventListener('focusin', () => { clearTimeout(timer); timer = 0; collapse(false); }, { signal });
      root.addEventListener('focusout', () => setTimeout(check, 0), { signal });
      // Un clic en la pastilla también la abre (pantallas híbridas).
      this.bg.addEventListener('click', () => collapse(false), { signal });
      this.fine.addEventListener('change', apply, { signal });
      apply();
    }

    // ---------- Táctil: se esconde al bajar, vuelve al subir ----------
    setupScroll(signal) {
      const root = this.root;
      let lastY = window.scrollY;
      let run = 0;
      let raf = 0;
      const tuck = (value) => root.classList.toggle('og-tabbar-tucked', value);
      const onScroll = () => {
        raf = 0;
        if (this.fine.matches) { tuck(false); lastY = window.scrollY; return; }
        const y = Math.max(0, window.scrollY);
        const dy = y - lastY;
        lastY = y;
        const doc = document.documentElement;
        const atTop = y < 80;
        const atEnd = window.innerHeight + y >= doc.scrollHeight - 40;
        if (atTop || atEnd) { run = 0; tuck(false); return; }
        if (dy > 0) {
          run = Math.max(0, run) + dy;
          if (run > 14) tuck(true);
        } else if (dy < 0) {
          run = Math.min(0, run) + dy;
          if (run < -8) tuck(false);
        }
      };
      window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll); }, { passive: true, signal });
      // Si alguien llega a la barra con el teclado, que esté a la vista.
      root.addEventListener('focusin', () => tuck(false), { signal });
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
