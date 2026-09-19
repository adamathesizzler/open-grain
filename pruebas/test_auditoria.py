"""Arreglos de la auditoría UX/UI (20.09.2026) y barra inferior estilo Pinterest:
idioma, semántica, contenido, Contacto en móvil, barra, pausa del carrusel y 404.

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
        lang_btn = pg.locator('#lang-switch').get_attribute("aria-label")
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
    # Escribiendo en el móvil, la barra se aparta del teclado y vuelve al salir.
    pg.locator("#name").tap(); pg.wait_for_timeout(350)
    away = pg.evaluate("document.getElementById('dock').classList.contains('og-tabbar-away')")
    check("contacto móvil: al escribir, la barra se aparta", away)
    pg.evaluate("document.activeElement.blur()"); pg.wait_for_timeout(350)
    check("contacto móvil: al terminar, la barra vuelve", not pg.evaluate("document.getElementById('dock').classList.contains('og-tabbar-away')"))
    ctx.close()
    ctx = context(br, saved_lang="en", viewport={"width": 1440, "height": 900})
    pg = ctx.new_page(); pg.goto(f"{BASE}/contact", wait_until="load"); pg.wait_for_timeout(300)
    pg.locator("#name").click(); pg.wait_for_timeout(300)
    check("contacto escritorio: la barra no se esconde al escribir", not pg.evaluate("document.getElementById('dock').classList.contains('og-tabbar-away')"))
    ctx.close()

    # --- Barra inferior (estilo Pinterest) ---
    NAMES = {"es": ["Inicio", "Proyectos", "Servicios", "Estudio", "Contacto"],
             "en": ["Home", "Work", "Services", "Studio", "Contact"]}
    for lang in ["es", "en"]:
        for vw, vh in [(1440, 900), (390, 844)]:
            ctx = context(br, saved_lang=lang, viewport={"width": vw, "height": vh})
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            for page, cur in [("/", "/"), ("/work", "/work"), ("/services", "/services"), ("/about", "/about"), ("/contact", "/contact")]:
                pg.goto(f"{BASE}{page}", wait_until="load"); pg.wait_for_timeout(350)
                tabs = pg.locator("#dock .og-tab")
                labels = tabs.evaluate_all("els=>els.map(a=>a.getAttribute('aria-label'))")
                hrefs = tabs.evaluate_all("els=>els.map(a=>a.getAttribute('href'))")
                current = pg.locator('#dock .og-tab[aria-current="page"]').evaluate_all("els=>els.map(a=>a.getAttribute('href'))")
                tag = f"barra {lang} {vw}px {page}"
                check(f"{tag}: cinco iconos con nombre", labels == NAMES[lang], labels)
                check(f"{tag}: enlaces limpios y página actual marcada", hrefs == ["/", "/work", "/services", "/about", "/contact"] and current == [cur], current)
                bb = pg.locator("#dock").bounding_box()
                centered = abs((bb["x"] + bb["width"] / 2) - vw / 2) <= 1
                check(f"{tag}: abajo y centrada", centered and bb["y"] + bb["height"] <= vh and bb["y"] > vh * 0.6, bb)
                sizes = tabs.evaluate_all("els=>els.map(a=>{const r=a.getBoundingClientRect();return Math.min(r.width,r.height)})")
                check(f"{tag}: cada botón mide al menos 44px", min(sizes) >= 44, sizes)
                # Sigue ahí al deslizar
                pg.evaluate("scrollTo({top: document.body.scrollHeight / 2, behavior: 'instant'})"); pg.wait_for_timeout(250)
                bb2 = pg.locator("#dock").bounding_box()
                check(f"{tag}: fija al deslizar", abs(bb2["y"] - bb["y"]) < 1, (bb["y"], bb2["y"]))
                if page == "/":
                    fb = pg.locator(".home-footer").bounding_box()
                    check(f"{tag}: en la portada flota encima del pie sin taparlo", bb2["y"] + bb2["height"] <= fb["y"] + 1, (bb2, fb))
                else:
                    pg.evaluate("scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'})"); pg.wait_for_timeout(1200)
                    last = pg.evaluate("""() => { const f = document.querySelector('.site-footer, .light-footer');
                        const r = f.getBoundingClientRect(); return r.bottom; }""")
                    bar_top = pg.locator("#dock").bounding_box()["y"]
                    check(f"{tag}: al final de la página, el pie queda por encima de la barra", last <= bar_top + 1, (last, bar_top))
            ctx.close()
    ctx = context(br, saved_lang="es", viewport={"width": 1440, "height": 900})
    pg = ctx.new_page(); pg.goto(f"{BASE}/services", wait_until="load"); pg.wait_for_timeout(300)
    pg.locator('#dock .og-tab[href="/work"]').hover(); pg.wait_for_timeout(500)
    op = pg.evaluate("getComputedStyle(document.querySelector('#dock .og-tab[href=\"/work\"] .og-tab-tip')).opacity")
    check("barra: al pasar el ratón aparece el nombre del icono", float(op) > 0.9, op)
    check("barra: Contacto destacado con el color de marca", pg.locator("#dock .og-tab-contact").count() == 1)
    pg.keyboard.press("Tab")
    ctx.close()
    # Idioma arriba a la derecha
    ctx = context(br, locale="en-US", viewport={"width": 390, "height": 844})
    pg = ctx.new_page(); pg.goto(f"{BASE}/work", wait_until="load"); pg.wait_for_timeout(300)
    lb = pg.locator("#lang-switch").bounding_box()
    check("idioma: botón arriba a la derecha, de al menos 44px de alto", lb["x"] + lb["width"] > 390 - 20 and lb["y"] < 20 and lb["height"] >= 44, lb)
    pg.locator("#lang-switch").click(); pg.wait_for_timeout(250)
    check("idioma: el botón cambia a español", pg.evaluate("document.documentElement.lang") == "es" and pg.text_content("#work-label") == "Trabajos seleccionados")
    pg.goto(f"{BASE}/services", wait_until="load"); pg.wait_for_timeout(250)
    check("idioma: la elección se mantiene al cambiar de página", pg.evaluate("document.documentElement.lang") == "es")
    check("idioma: el menú ya no tiene botón de tema", pg.locator('[data-action="theme"]').count() == 0)
    ctx.close()
    # Tema automático por la hora, aunque hubiera uno guardado del botón antiguo
    for hour, want in [(22, True), (12, False)]:
        ctx = context(br, saved_lang="es")
        ctx.add_init_script("localStorage.setItem('og_theme', 'light')" if want else "localStorage.setItem('og_theme', 'dark')")
        pg = ctx.new_page()
        pg.clock.set_fixed_time(f"2026-09-20T{hour:02d}:00:00")
        pg.goto(f"{BASE}/services", wait_until="load"); pg.wait_for_timeout(250)
        dark = pg.evaluate("document.getElementById('site-shell').classList.contains('dark-mode')")
        check(f"tema: a las {hour}:00 es {'noche' if want else 'día'} aunque hubiera otro guardado", dark == want)
        ctx.close()
    # Aviso de cookies por encima de la barra
    ctx = br.new_context(viewport={"width": 390, "height": 844})
    ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    pg = ctx.new_page(); pg.goto(f"{BASE}/", wait_until="load"); pg.wait_for_timeout(500)
    cb = pg.locator("#cookie-banner").bounding_box(); db = pg.locator("#dock").bounding_box()
    check("cookies: el aviso queda por encima de la barra", cb and cb["y"] + cb["height"] <= db["y"], (cb, db))
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
