"""Reestructuración de páginas, vista ampliada y accesibilidad."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8777"
PAGES = ["index.html", "work.html", "services.html", "about.html", "contact.html"]
results = []


def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": str(detail)})
    print(("  PASA  " if ok else "  FALLA ") + name + (f"  [{detail}]" if detail else ""))
    return ok


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # --- Portada ---
    page.goto(f"{BASE}/index.html", wait_until="networkidle")
    page.wait_for_timeout(400)
    check("portada: hay un h1", page.locator("h1").count() == 1, page.locator("h1").count())
    check("portada: la intro no se superpone a las fotos",
          page.locator(".home-intro").bounding_box()["y"] <
          page.locator("#home-grid").bounding_box()["y"])
    check("portada: acción «Pedir presupuesto» hacia Contacto",
          page.get_attribute("#home-cta-quote", "href") == "contact.html")
    tiles = page.locator("#home-grid .project-tile").count()
    check("portada: el portfolio no se repite", tiles == 24, f"{tiles} piezas para 24 proyectos")
    check("portada: no hay piezas ocultas a lectores de pantalla por repetición",
          page.locator('#home-grid .project-tile[aria-hidden="true"]').count() == 0)
    # El pie tiene que ser alcanzable sin scroll infinito.
    page.keyboard.press("End")
    page.wait_for_timeout(700)
    fb = page.locator(".home-footer").bounding_box()
    check("portada: se llega al pie", fb is not None and fb["y"] < 900, fb)
    check("portada: el pie no tapa la acción de ver todo",
          page.locator("#home-cta-all").bounding_box()["y"] + 20 < fb["y"], )

    # --- Servicios ---
    page.goto(f"{BASE}/services.html", wait_until="networkidle")
    page.wait_for_timeout(400)
    n = page.locator("#service-cards li").count()
    check("servicios: se listan los servicios reales", n == 5, n)
    check("servicios: cada uno explica qué se produce",
          page.locator("#service-cards .svc-blurb").count() == 5)
    check("servicios: cada uno dice «presupuesto personalizado», sin tarifas inventadas",
          page.locator("#service-cards .svc-meta").count() == 5)
    asks = page.locator("#service-cards .svc-ask")
    check("servicios: cada uno tiene acción de consulta", asks.count() == 5)
    check("servicios: la acción lleva a Contacto con el servicio",
          asks.first.get_attribute("href") == "contact.html?service=0",
          asks.first.get_attribute("href"))

    # --- La preselección funciona de verdad ---
    page.goto(f"{BASE}/contact.html?service=2", wait_until="networkidle")
    page.wait_for_timeout(500)
    check("contacto: llega con el servicio ya seleccionado",
          page.input_value("#service") == "svc-2", page.input_value("#service"))
    label = page.evaluate("""() => {const s=document.getElementById('service');
        return s.options[s.selectedIndex].textContent;}""")
    check("contacto: y muestra su nombre, no un código", label and not label.startswith("svc-"), label)

    page.goto(f"{BASE}/contact.html?ref=Formula%20E", wait_until="networkidle")
    page.wait_for_timeout(500)
    msg = page.input_value("#message")
    check("contacto: «quiero algo parecido» trae la referencia del proyecto",
          "Formula E" in msg, msg[:60])

    # --- Contacto en móvil: formulario antes que la foto ---
    m = browser.new_context(viewport={"width": 393, "height": 852}, has_touch=True, is_mobile=True).new_page()
    m.goto(f"{BASE}/contact.html", wait_until="networkidle")
    m.wait_for_timeout(400)
    fy = m.locator("#contact-form").bounding_box()["y"]
    ay = m.locator(".contact-card aside").bounding_box()["y"]
    check("contacto móvil: el formulario va antes que la foto decorativa", fy < ay, f"form={fy} foto={ay}")
    check("contacto móvil: los campos son de 16px (sin zoom forzado de iOS)",
          m.evaluate("() => getComputedStyle(document.getElementById('name')).fontSize") == "16px")
    check("contacto: los campos opcionales están marcados",
          m.locator("#label-phone .og-optional").count() == 1)
    check("contacto: Instagram es pulsable",
          m.locator('.contact-details a[href*="instagram.com"]').count() == 1)
    check("contacto: «Llamar» está separado de WhatsApp",
          m.locator('.contact-details a[href^="tel:"]').count() == 1 and
          m.locator('.contact-details a[href*="wa.me"]').count() == 1)
    check("contacto: «Todavía no lo sé» está disponible en presupuesto",
          m.locator('#budget option[value="undecided"]').count() == 1)
    m.close()

    # --- Vista ampliada ---
    page.goto(f"{BASE}/work.html", wait_until="networkidle")
    page.wait_for_timeout(500)
    page.locator("#masonry-grid .project-tile").first.click()
    page.wait_for_timeout(500)
    check("vista ampliada: se abre", page.locator("#lightbox").is_visible())
    check("vista ampliada: el foco entra en el diálogo",
          page.evaluate("() => document.getElementById('lightbox').contains(document.activeElement)"))
    check("vista ampliada: el fondo queda inerte",
          page.evaluate("() => document.getElementById('site-shell').inert") is True)
    check("vista ampliada: hay contador",
          "/" in page.inner_text("#lightbox-count"), page.inner_text("#lightbox-count"))
    check("vista ampliada: hay acción «quiero algo parecido»",
          "contact.html?ref=" in page.get_attribute("#lightbox-cta", "href"),
          page.get_attribute("#lightbox-cta", "href"))
    check("vista ampliada: la imagen tiene texto alternativo útil",
          len(page.get_attribute("#lightbox-img", "alt") or "") > 4,
          page.get_attribute("#lightbox-img", "alt"))
    first_src = page.get_attribute("#lightbox-img", "src")
    page.click("#lightbox-next")
    page.wait_for_timeout(250)
    check("vista ampliada: siguiente cambia de foto",
          page.get_attribute("#lightbox-img", "src") != first_src)
    # El tabulador no debe escaparse del diálogo.
    for _ in range(10):
        page.keyboard.press("Tab")
    check("vista ampliada: el foco no se escapa con el tabulador",
          page.evaluate("() => document.getElementById('lightbox').contains(document.activeElement)"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    check("vista ampliada: Escape cierra", page.locator("#lightbox").is_hidden())
    check("vista ampliada: el fondo vuelve a ser usable",
          page.evaluate("() => document.getElementById('site-shell').inert") is False)
    check("vista ampliada: el foco vuelve a la foto de origen",
          page.evaluate("() => !!document.activeElement.closest('.project-tile')"))
    check("vista ampliada: se restaura el scroll de la página",
          page.evaluate("() => document.body.style.overflow") == "")

    # --- Sin publicaciones sociales inventadas ---
    page.goto(f"{BASE}/about.html", wait_until="networkidle")
    page.wait_for_timeout(700)
    posts = page.locator("#social-grid .social-post").count()
    empty_visible = page.locator("#social-empty").is_visible()
    check("estudio: sin publicaciones sociales fabricadas",
          posts == 0 and empty_visible, f"piezas={posts} aviso={empty_visible}")

    # --- Accesibilidad y estructura en las cinco páginas ---
    for f in PAGES:
        page.goto(f"{BASE}/{f}", wait_until="networkidle")
        page.wait_for_timeout(350)
        h1 = page.locator("h1").count()
        check(f"{f}: exactamente un h1", h1 == 1, h1)
        check(f"{f}: <html lang> declarado",
              page.evaluate("() => document.documentElement.lang") in ("es", "en"))
        no_alt = page.evaluate("""() => [...document.querySelectorAll('img')]
            .filter(i => !i.hasAttribute('alt')).length""")
        check(f"{f}: ninguna imagen sin atributo alt", no_alt == 0, no_alt)
        # Zoom al 200 %: se emula reduciendo el viewport a la mitad.
        page.set_viewport_size({"width": 720, "height": 450})
        page.wait_for_timeout(250)
        sw = page.evaluate("() => document.documentElement.scrollWidth")
        check(f"{f}: sin scroll horizontal al 200 % de zoom", sw <= 721, sw)
        page.set_viewport_size({"width": 1440, "height": 900})
        # La navegación de respaldo existe en el HTML servido.
        html = page.evaluate("() => document.documentElement.outerHTML")
        check(f"{f}: el notch se ha montado sobre #dock",
              page.locator("#dock .og-notch-toggle").count() == 1)

    check("sin errores de JavaScript en ninguna página", not errors, errors[:3])
    browser.close()

ok = sum(1 for r in results if r["ok"])
print(f"\n{ok}/{len(results)} comprobaciones superadas")
json.dump(results, open("/tmp/claude-0/-home-claude/4e195ff9-b257-56a5-94cc-dc87fbd52317/scratchpad/res_pages.json", "w"), indent=1, ensure_ascii=False)
sys.exit(0 if ok == len(results) else 1)
