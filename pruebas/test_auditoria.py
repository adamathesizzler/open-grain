"""Arreglos de la auditoría UX/UI (20.09.2026): idioma, semántica, contenido,
Contacto en móvil, notch que no tapa campos, pausa del carrusel y 404.

Necesita el sitio servido con URLs limpias (como Vercel), p. ej.:
    python3 pruebas/servidor_limpio.py . 8777 &
    python3 pruebas/test_auditoria.py
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8777"
results = []


def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": str(detail)})
    print(("  PASA  " if ok else "  FALLA ") + name + (f"  [{detail}]" if detail else ""))
    return ok


def context(browser, locale="en-US", saved_lang=None, reduced=False, **kw):
    ctx = browser.new_context(locale=locale, reduced_motion="reduce" if reduced else "no-preference", **kw)
    init = "try{localStorage.setItem('og_cookie_consent','rejected');"
    if saved_lang:
        init += f"localStorage.setItem('og_lang','{saved_lang}');"
    init += "}catch(e){}"
    ctx.add_init_script(init)
    # Nada sale a Internet: Supabase y la CDN quedan fuera, igual que sin red.
    ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    return ctx


with sync_playwright() as pw:
    br = pw.chromium.launch()
    errors = []

    # --- Idioma de la primera visita ---
    for loc, want in [("es-ES", "es"), ("ca-ES", "es"), ("en-GB", "en"), ("de-DE", "en")]:
        ctx = context(br, locale=loc)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(f"{BASE}/", wait_until="load"); pg.wait_for_timeout(300)
        check(f"idioma: navegador {loc} abre en {want}", pg.evaluate("document.documentElement.lang") == want)
        ctx.close()
    ctx = context(br, locale="es-ES", saved_lang="en")
    pg = ctx.new_page(); pg.goto(f"{BASE}/", wait_until="load"); pg.wait_for_timeout(300)
    check("idioma: la elección guardada manda sobre el navegador", pg.evaluate("document.documentElement.lang") == "en")
    ctx.close()

    # --- Portada: sólo cambios invisibles ---
    for lang, h1 in [("es", "estudio de producción creativa"), ("en", "creative production studio")]:
        ctx = context(br, saved_lang=lang, viewport={"width": 1440, "height": 900})
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(f"{BASE}/", wait_until="load"); pg.wait_for_timeout(400)
        t = pg.text_content("#home-title")
        check(f"portada {lang}: h1 oculto en el idioma de la página", h1 in t and pg.get_attribute("#home-title", "lang") is None, t)
        tiles = pg.locator('#home-grid .project-tile:not([aria-hidden="true"])')
        n = tiles.count()
        check(f"portada {lang}: 24 piezas anunciadas como botón", n == 24 and tiles.evaluate_all("els=>els.every(e=>e.getAttribute('role')==='button')"), n)
        label = tiles.first.get_attribute("aria-label")
        check(f"portada {lang}: el botón dice qué abre y describe la foto", label and ("Formula E" in label) and len(label) > 40, label)
        alts = pg.locator('#home-grid .project-tile:not([aria-hidden="true"]) img').evaluate_all("els=>els.map(i=>i.alt)")
        check(f"portada {lang}: alt descriptivo, no «Título — Tipo»", all(a and " — " not in a for a in alts), alts[:2])
        check(f"portada {lang}: repeticiones siguen ocultas al lector", pg.locator('#home-grid .project-tile[aria-hidden="true"][role]').count() == 0)
        tiles.first.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
        check(f"portada {lang}: Enter abre la vista ampliada", pg.is_visible("#lightbox"))
        lb_alt = pg.get_attribute("#lightbox-img", "alt")
        check(f"portada {lang}: la foto ampliada lleva el alt descriptivo", lb_alt == alts[0], lb_alt)
        close_label = pg.get_attribute("#lightbox-close", "aria-label")
        check(f"portada {lang}: «Cerrar» en el idioma de la página", close_label == ("Cerrar" if lang == "es" else "Close"), close_label)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        check(f"portada {lang}: Escape cierra y el foco vuelve a la foto", pg.evaluate("document.activeElement.classList.contains('project-tile')"))
        legal = pg.locator(".home-footer-legal a").evaluate_all("els=>els.map(a=>a.getAttribute('href')+'|'+a.lang)")
        check(f"portada {lang}: enlaces legales sin .html y marcados en español", legal == ["/aviso-legal|es", "/privacidad|es", "/cookies|es"], legal)
        lang_btn = pg.locator('[data-action="lang"]').get_attribute("aria-label")
        check(f"portada {lang}: el botón de idioma dice su acción", lang_btn and ("inglés" in lang_btn if lang == "es" else "Spanish" in lang_btn), lang_btn)
        ctx.close()

    # --- Proyectos ---
    ctx = context(br, saved_lang="es", viewport={"width": 1440, "height": 900})
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(f"{BASE}/work", wait_until="load"); pg.wait_for_timeout(400)
    lede = pg.text_content("#work-lede")
    check("proyectos: la frase ya no dice «creadas en Mallorca»", "de viaje" in lede, lede)
    n = pg.locator('#masonry-grid .project-tile[role="button"]').count()
    check("proyectos: 24 piezas como botón", n == 24, n)
    pg.locator("#masonry-grid .project-tile").nth(3).click(); pg.wait_for_timeout(500)
    check("proyectos: la pieza abre la vista ampliada", pg.is_visible("#lightbox"))
    ctx.close()

    # --- Servicios ---
    for lang in ["es", "en"]:
        ctx = context(br, saved_lang=lang, viewport={"width": 1440, "height": 900})
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(f"{BASE}/services", wait_until="load"); pg.wait_for_timeout(400)
        blurbs = pg.locator("#service-cards .svc-blurb").count()
        check(f"servicios {lang}: cada servicio tiene su descripción", blurbs == 5, blurbs)
        hrefs = pg.locator("#service-cards .svc-link").evaluate_all("els=>els.map(a=>a.getAttribute('href'))")
        check(f"servicios {lang}: cada servicio lleva a /contact?service=N", hrefs == [f"/contact?service={i}" for i in range(5)], hrefs)
        btn = pg.locator("#marquee-toggle")
        check(f"servicios {lang}: botón de pausa visible", btn.is_visible())
        state = lambda: pg.evaluate("getComputedStyle(document.querySelector('.marquee-track')).animationPlayState")
        check(f"servicios {lang}: el carrusel arranca en marcha", state() == "running")
        btn.click(); pg.wait_for_timeout(100)
        check(f"servicios {lang}: el botón lo pausa", state() == "paused", state())
        txt = pg.text_content("#marquee-toggle-text")
        check(f"servicios {lang}: el botón pasa a «reanudar»", txt == ("Reanudar" if lang == "es" else "Play"), txt)
        btn.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
        check(f"servicios {lang}: con teclado se reanuda", state() == "running")
        bb = btn.bounding_box()
        check(f"servicios {lang}: el botón mide al menos 24px de alto", bb["height"] >= 24, bb)
        check(f"servicios {lang}: sin vista ampliada que no se usa", pg.locator("#lightbox").count() == 0)
        ctx.close()
    ctx = context(br, saved_lang="es", reduced=True)
    pg = ctx.new_page(); pg.goto(f"{BASE}/services", wait_until="load"); pg.wait_for_timeout(300)
    check("servicios: con movimiento reducido el botón de pausa no aparece", not pg.is_visible("#marquee-toggle"))
    ctx.close()

    # --- Estudio: sección de redes ---
    ctx = context(br, saved_lang="en", viewport={"width": 1440, "height": 900})
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(f"{BASE}/about", wait_until="load"); pg.wait_for_timeout(500)
    check("estudio: sin publicaciones, la sección de redes no se ve", not pg.is_visible("#social"))
    check("estudio: el texto del panel no aparece en la página", "studio panel" not in pg.inner_text("body") and "Posts can be selected" not in pg.inner_text("body"))
    pg.evaluate("""applyRealSocial([
        {platform:'instagram', external_url:'https://instagram.com/p/x', image_url:'/assets/portfolio/shibuya-480.webp', caption:'Shibuya', sort_order:1},
        {platform:'tiktok', external_url:'https://tiktok.com/x', image_url:'/assets/portfolio/halo-detail-480.webp', caption:'', sort_order:2}])""")
    pg.wait_for_timeout(300)
    check("estudio: con publicaciones reales, la sección aparece", pg.is_visible("#social"))
    tabs = pg.locator("#net-tabs [role=tab]").evaluate_all("els=>els.map(e=>e.dataset.net)")
    check("estudio: sin canal ni publicaciones, no hay pestaña de YouTube", "youtube" not in tabs, tabs)
    check("estudio: las pestañas apuntan al panel", pg.locator('#net-tabs [aria-controls="social-grid"]').count() == len(tabs))
    post = pg.locator(".social-post").first
    check("estudio: cada publicación se anuncia como botón con nombre", post.get_attribute("role") == "button" and bool(post.get_attribute("aria-label")))
    # Publicación sin pie: el h3 de la ventana no debe quedar vacío y visible.
    pg.evaluate("socialNet='tiktok'; renderNetTabs(); renderSocialGrid();"); pg.wait_for_timeout(200)
    pg.locator(".social-post").first.click(); pg.wait_for_timeout(400)
    check("estudio: sin pie de foto, no queda un encabezado vacío", pg.evaluate("document.getElementById('post-sheet-caption').hidden"))
    ctx.close()
    ctx = context(br, saved_lang="en", viewport={"width": 1440, "height": 900})
    ctx.add_init_script("localStorage.setItem('og_theme','dark')")
    pg = ctx.new_page(); pg.goto(f"{BASE}/about", wait_until="load"); pg.wait_for_timeout(300)
    pg.evaluate("applyRealSocial([{platform:'instagram', external_url:'', image_url:'/assets/portfolio/shibuya-480.webp', caption:'x', sort_order:1}])")
    col = pg.evaluate("getComputedStyle(document.querySelector('.social-head-light h2')).color")
    check("estudio (noche): el titular de redes es claro sobre fondo oscuro", col == "rgb(241, 245, 251)", col)
    ctx.close()

    # --- Contacto ---
    ctx = context(br, saved_lang="es", viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(f"{BASE}/contact", wait_until="load"); pg.wait_for_timeout(500)
    fy = pg.locator("#contact-form").bounding_box()["y"]; cy = pg.locator("#service-card").bounding_box()["y"]
    check("contacto móvil: el formulario va antes que la tarjeta", fy < cy, f"form {fy} / tarjeta {cy}")
    check("contacto: encabezado oculto para los canales", pg.text_content("#contact-more-title") == "Otras formas de contactar")
    ph = pg.evaluate("document.querySelector('#budget option').textContent")
    check("contacto: el presupuesto ya no muestra sólo «€»", ph != "€" and "€" in ph, ph)
    # Recorrer el formulario: en cada posición, el notch debe apartarse sólo
    # cuando de verdad tapa un campo.
    samples = []
    for y in range(300, 1700, 50):
        pg.evaluate(f"scrollTo(0, {y})"); pg.wait_for_timeout(160)
        samples.append(pg.evaluate("""() => {
            const d = document.getElementById('dock');
            if (d.dataset.edge !== 'right' || d.classList.contains('og-is-travelling')) return null;
            const t = document.querySelector('.og-notch-toggle').getBoundingClientRect();
            const hits = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].some(c => {
                const b = c.getBoundingClientRect();
                return b.width && b.right > t.left && b.left < t.right && b.bottom > t.top && b.top < t.bottom; });
            return { hits, yielded: d.classList.contains('og-notch-yield'), pe: getComputedStyle(d).pointerEvents };
        }"""))
    samples = [x for x in samples if x]
    overlap = [x for x in samples if x["hits"]]
    check("contacto móvil: hay posiciones en las que el notch caería sobre un campo", len(overlap) > 0, f"{len(overlap)} de {len(samples)}")
    check("contacto móvil: en todas ellas se aparta y deja pasar el toque",
          all(x["yielded"] and x["pe"] == "none" for x in overlap), overlap[:2])
    check("contacto móvil: donde no tapa nada, sigue visible",
          all(not x["yielded"] for x in samples if not x["hits"]))
    # Donde no hay campos detrás, el notch sigue a mano.
    pg.evaluate("scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(1200)
    info2 = pg.evaluate("({edge: document.getElementById('dock').dataset.edge, yielded: document.getElementById('dock').classList.contains('og-notch-yield')})")
    check("contacto móvil: lejos de los campos el notch vuelve", not info2["yielded"], info2)
    ctx.close()
    ctx = context(br, saved_lang="en", viewport={"width": 1440, "height": 900})
    pg = ctx.new_page(); pg.goto(f"{BASE}/contact", wait_until="load"); pg.wait_for_timeout(300)
    pg.evaluate("scrollTo(0, 500)"); pg.wait_for_timeout(1200)
    check("contacto escritorio: el notch no se aparta sin motivo", not pg.evaluate("document.getElementById('dock').classList.contains('og-notch-yield')"))
    ctx.close()

    # --- 404 y enlaces ---
    ctx = context(br)
    pg = ctx.new_page()
    r = pg.goto(f"{BASE}/esta-pagina-no-existe", wait_until="load")
    check("404: responde 404 con la página de la marca", r.status == 404 and "no existe" in pg.inner_text("h1"), r.status)
    hrefs = pg.locator(".nf-actions a").evaluate_all("els=>els.map(a=>a.getAttribute('href'))")
    check("404: salidas a Inicio, Proyectos y Contacto", hrefs == ["/", "/work", "/contact"], hrefs)
    r = pg.goto(f"{BASE}/a/b/c", wait_until="load")
    check("404: se ve bien también en rutas profundas", pg.evaluate("getComputedStyle(document.querySelector('.legal-page')).backgroundColor") == "rgb(242, 238, 230)")
    bad = []
    for page in ["/", "/work", "/services", "/about", "/contact", "/aviso-legal", "/privacidad", "/cookies"]:
        pg.goto(f"{BASE}{page}", wait_until="load"); pg.wait_for_timeout(200)
        links = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/')||!/^(https?:|mailto:|tel:|#)/.test(h))")
        for h in set(links):
            if ".html" in h: bad.append(f"{page}: {h} (lleva .html)")
            st = pg.request.get(f"{BASE}{h if h.startswith('/') else '/' + h}").status
            if st != 200: bad.append(f"{page}: {h} → {st}")
    check("enlaces internos: todos responden 200 y sin .html", not bad, bad[:6])
    ctx.close()

    check("sin errores de JavaScript en ninguna página", not errors, errors[:3])
    br.close()

json.dump(results, open("pruebas/resultado_auditoria.json", "w"), ensure_ascii=False, indent=1)
fails = [r for r in results if not r["ok"]]
print(f"\n{len(results) - len(fails)}/{len(results)} pasan")
sys.exit(1 if fails else 0)
