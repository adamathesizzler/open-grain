/* ==========================================================================
   OPEN GRAIN — Tarjeta de reserva del cliente

   La reserva vive en `projects`, que es admin-only. Esta página no lee la
   tabla: llama a la función `public_booking(token)` de Supabase, que devuelve
   SOLO la reserva cuyo token coincide y SOLO los campos que el cliente debe
   ver (ver supabase/migration_booking_card.sql).

   URL:  reserva.html?t=<public_token>

   Nada se inventa: cada fila del reverso aparece únicamente si ese dato
   existe en la reserva.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.getElementById('rsv-root');
  if (!root) return;

  // ---------------------------------------------------------------- utilidades
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));

  const ICON = {
    check: '<circle cx="10" cy="10" r="7"/><path class="rsv-tick" d="m6.9 10.2 2 2.1 4.2-4.4"/>',
    calendar: '<rect x="3" y="4.6" width="14" height="12.4" rx="2.6"/><path d="M3 8.6h14M6.9 3.1v3M13.1 3.1v3"/>',
    clock: '<circle cx="10" cy="10" r="7"/><path d="M10 5.9v4.3l2.8 1.7"/>',
    pin: '<path d="M10 17.4s5.4-5 5.4-8.9a5.4 5.4 0 1 0-10.8 0c0 3.9 5.4 8.9 5.4 8.9Z"/><circle cx="10" cy="8.4" r="2"/>',
    image: '<rect x="3" y="4.6" width="14" height="10.8" rx="2.6"/><path d="m3.7 13.3 3.2-3.1a1.6 1.6 0 0 1 2.2 0l3.3 3.2"/><circle cx="12.7" cy="8.1" r="1.1"/>',
    doc: '<path d="M5.6 3.4h6L15 6.8v9.8H5.6Z"/><path d="M11.3 3.5v3.4h3.5M7.5 11h5M7.5 13.5h3.2"/>',
    arrow: '<path d="M6.6 13.4 13.4 6.6M8 6.6h5.4V12"/>',
    sliders: '<path d="M3.6 6.6h4.6M12.6 6.6h3.8M3.6 13.4h3.4M11.4 13.4h5"/><circle cx="10.4" cy="6.6" r="1.9"/><circle cx="9.2" cy="13.4" r="1.9"/>',
  };
  const icon = (name, size = 18, sw = 1.4) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

  const state = (title, detail) => {
    root.innerHTML = `<div class="rsv-state"><p>${esc(title)}</p><small>${detail}</small></div>`;
  };

  // El sitio cambia a oscuro por hora (main.js); aquí se respeta esa regla y
  // además gana el modo oscuro del propio dispositivo si lo tiene puesto.
  (function applyTheme() {
    const h = new Date().getHours();
    const system = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    if (system || h < 7 || h >= 20) document.getElementById('site-shell').classList.add('dark-mode');
  })();

  // ---------------------------------------------------------------- formato
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // event_date llega como 'YYYY-MM-DD'; se parte a mano para no depender de
  // la zona horaria del navegador (new Date('2026-10-24') es UTC y en Mallorca
  // puede mostrar el día anterior).
  const parseDate = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  };
  const longDate = (d) => (d ? `${d.d} ${MONTHS[d.m - 1]} ${d.y}` : '');
  const shortDate = (d) => (d ? `${String(d.d).padStart(2, '0')} ${MONTHS[d.m - 1].slice(0, 3).toUpperCase()} ${d.y}` : '');
  const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
  const timeRange = (a, b) => (a && b ? `${hhmm(a)}–${hhmm(b)}` : hhmm(a));

  const STATUS = {
    confirmed: 'Reserva confirmada',
    in_progress: 'Sesión en curso',
    delivered: 'Trabajo entregado',
  };

  // ---------------------------------------------------------------- .ics
  // Se genera en el navegador, con los datos reales de la reserva.
  function icsFor(b, date) {
    const pad = (n) => String(n).padStart(2, '0');
    const day = `${b.event_date.slice(0, 4)}${b.event_date.slice(5, 7)}${b.event_date.slice(8, 10)}`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const fold = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

    let start, end;
    if (b.start_time) {
      const s = hhmm(b.start_time).split(':');
      start = `DTSTART:${day}T${pad(s[0])}${pad(s[1])}00`;
      if (b.end_time) {
        const e = hhmm(b.end_time).split(':');
        end = `DTEND:${day}T${pad(e[0])}${pad(e[1])}00`;
      }
    } else {
      start = `DTSTART;VALUE=DATE:${day}`;
    }

    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OPEN GRAIN//Reservas//ES', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${b.public_code || 'reserva'}@open-grain`,
      `DTSTAMP:${stamp}`, start, end,
      `SUMMARY:${fold(b.title)} · OPEN GRAIN`,
      b.location ? `LOCATION:${fold(b.location)}` : '',
      `DESCRIPTION:${fold([b.service, b.deliverables, location.href].filter(Boolean).join(' — '))}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean);

    return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  }

  // ---------------------------------------------------------------- pintado
  function render(b) {
    const date = parseDate(b.event_date);
    const status = STATUS[b.status] || 'Reserva';
    const who = b.title || b.client_name || 'Tu sesión';

    // Solo entran las filas que tienen dato real detrás.
    const rows = [
      date && ['calendar', 'Fecha', longDate(date)],
      b.start_time && ['clock', 'Hora', timeRange(b.start_time, b.end_time)],
      b.location && ['pin', 'Lugar', b.location],
      b.deliverables && ['image', 'Incluye', b.deliverables],
      b.delivery_note && ['doc', 'Entrega', b.delivery_note],
    ].filter(Boolean);

    const chip = `<div class="rsv-chip">${icon('check', 16, 1.5)}<span>${esc(status)}</span></div>`;
    const cover = b.cover_url
      ? `<div class="rsv-cover" style="background-image:url('${esc(b.cover_url)}')">${chip}</div>`
      : `<div class="rsv-cover is-blank"><span>Open Grain</span>${chip}</div>`;

    const when = [date && shortDate(date), b.start_time && hhmm(b.start_time)]
      .filter(Boolean).join(' · ');

    root.innerHTML = `
      <div class="rsv-stage">
        <div class="rsv-enter">
        <div class="rsv-card" id="rsv-card">

          <section class="rsv-face rsv-front" aria-label="Tu reserva">
            ${cover}
            <div class="rsv-body">
              <div class="rsv-brand rise" style="animation-delay:150ms">Open Grain</div>
              <div class="rise" style="animation-delay:200ms">
                <h1 class="rsv-title">${esc(who)}</h1>
                ${b.service ? `<div class="rsv-sub">${esc(b.service)}</div>` : ''}
              </div>
              ${when ? `<div class="rsv-when rise" style="animation-delay:250ms">${icon('calendar', 17)}<span>${esc(when)}</span></div>` : ''}
              <div class="rsv-actions rise" style="animation-delay:300ms">
                <button type="button" class="rsv-btn rsv-btn-primary" id="rsv-to-back"
                        aria-controls="rsv-card" aria-expanded="false">
                  <span>Ver detalles</span>${icon('arrow', 16, 1.5)}
                </button>
              </div>
            </div>
          </section>

          <section class="rsv-face rsv-back" aria-label="Detalle de tu reserva" aria-hidden="true" inert>
            <div class="rsv-body">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                <div class="rsv-brand">Open Grain</div>
                <button type="button" class="rsv-btn rsv-btn-secondary" id="rsv-to-front"
                        style="min-height:44px;padding:0 16px;font-size:13px">Volver</button>
              </div>
              <h2 class="rsv-title">Tu sesión, al detalle</h2>
              ${rows.length ? `<dl class="rsv-rows">${rows.map(([ic, k, v]) => `
                <div class="rsv-row">${icon(ic)}<dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
                : '<p class="rsv-sub" style="margin:0">Te escribiremos con los detalles en cuanto estén cerrados.</p>'}
              <div class="rsv-actions">
                ${date ? `<button type="button" class="rsv-btn rsv-btn-primary" id="rsv-ics">
                  ${icon('calendar', 17, 1.5)}<span>Añadir al calendario</span></button>` : ''}
                <a class="rsv-btn rsv-btn-secondary" id="rsv-manage" href="#">
                  ${icon('sliders', 17, 1.5)}<span>Gestionar reserva</span></a>
              </div>
              ${b.public_code ? `<div class="rsv-code">${esc(b.public_code)}</div>` : ''}
            </div>
          </section>

        </div>
        </div>
      </div>`;

    // ---- giro: una transición, interrumpible a mitad
    const card = document.getElementById('rsv-card');
    const front = card.querySelector('.rsv-front');
    const back = card.querySelector('.rsv-back');
    const toBack = document.getElementById('rsv-to-back');
    const toFront = document.getElementById('rsv-to-front');

    function flip(showBack) {
      card.classList.toggle('is-flipped', showBack);
      toBack.setAttribute('aria-expanded', String(showBack));
      // la cara oculta sale del foco y del lector de pantalla
      [[front, showBack], [back, !showBack]].forEach(([face, hidden]) => {
        face.toggleAttribute('inert', hidden);
        face.setAttribute('aria-hidden', String(hidden));
      });
      (showBack ? toFront : toBack).focus({ preventScroll: true });
    }
    toBack.addEventListener('click', () => flip(true));
    toFront.addEventListener('click', () => flip(false));

    // ---- añadir al calendario
    const ics = document.getElementById('rsv-ics');
    if (ics) ics.addEventListener('click', () => {
      const url = URL.createObjectURL(icsFor(b, date));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${b.public_code || 'reserva'}-open-grain.ics`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // ---- gestionar reserva: correo con el código ya puesto
    const manage = document.getElementById('rsv-manage');
    const subject = `Reserva ${b.public_code || ''} — ${b.title || ''}`.trim();
    manage.href = `mailto:adamabalde1998@gmail.com?subject=${encodeURIComponent(subject)}`;

    document.title = `${who} · Reserva OPEN GRAIN`;
  }

  // ---------------------------------------------------------------- carga
  async function load() {
    const token = new URLSearchParams(location.search).get('t');
    if (!token) {
      return state('Falta el enlace de tu reserva.',
        'Abre la tarjeta desde el enlace que te enviamos por correo o WhatsApp.');
    }
    if (!window.supabase || !window.SUPABASE_URL) {
      return state('No podemos cargar tu reserva ahora mismo.', 'Vuelve a intentarlo en un minuto.');
    }

    const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { data, error } = await db.rpc('public_booking', { token });

    if (error) {
      console.error('[reserva]', error.message);
      return state('No podemos cargar tu reserva ahora mismo.',
        'Vuelve a intentarlo en un minuto o escríbenos desde <a href="contact.html">Contacto</a>.');
    }
    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking) {
      return state('No encontramos esta reserva.',
        'Puede que el enlace esté incompleto. Escríbenos desde <a href="contact.html">Contacto</a> y lo revisamos.');
    }
    render(booking);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
