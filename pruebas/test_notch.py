"""Prueba real del notch sobre el sitio completo (no sobre la demo)."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8777"
results = []


def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": str(detail)})
    print(("  PASA  " if ok else "  FALLA ") + name + (f"  [{detail}]" if detail else ""))
    return ok


def box(page):
    return page.evaluate("""() => {
      const t = document.querySelector('#dock .og-notch-toggle');
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return {x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width),
              h:Math.round(r.height), edge:document.getElementById('dock').dataset.edge};
    }""")


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/index.html", wait_until="networkidle")

    # --- 1. Estado inicial: arriba, centrado ---
    b = box(page)
    check("notch existe al cargar", b is not None, b)
    if b:
        centro = abs((b["x"] + b["w"] / 2) - 1440 / 2)
        check("arranca en el borde superior", b["y"] < 60, f"y={b['y']}")
        check("arranca centrado horizontalmente", centro < 40, f"desvío={centro:.0f}px")
        check("data-edge=top", b["edge"] == "top", b["edge"])

    # --- 2. Sólo hay un menú, no dos ---
    check("un único #dock", page.locator("#dock").count() == 1)
    check("no queda dock antiguo", page.locator(".dock-btn").count() == 0)

    # --- 3. Hover despliega (escritorio) ---
    page.hover("#dock .og-notch-toggle")
    page.wait_for_timeout(350)
    check("hover abre el panel", page.locator("#dock .og-notch-panel").is_visible())
    check("aria-expanded=true", page.get_attribute("#dock .og-notch-toggle", "aria-expanded") == "true")
    n_items = page.locator("#dock .og-notch-item").count()
    check("7 opciones (5 páginas + idioma + tema)", n_items == 7, n_items)
    page.mouse.move(720, 600)
    page.wait_for_timeout(400)
    check("se recoge al salir", not page.locator("#dock .og-notch-panel").is_visible())

    # --- 4. Viaje arriba → izquierda ---
    page.evaluate("window.scrollTo(0, 900)")
    page.wait_for_timeout(1100)
    b2 = box(page)
    check("viaja a la izquierda", b2 and b2["edge"] == "left", b2)
    if b2:
        check("pegado al borde izquierdo", b2["x"] < 30, f"x={b2['x']}")
        check("a media altura, no abajo", 200 < b2["y"] < 700, f"y={b2['y']}")
        check("no se ha ido a la derecha", b2["x"] < 1440 / 2, f"x={b2['x']}")

    # --- 5. Abre hacia dentro desde la izquierda ---
    page.hover("#dock .og-notch-toggle")
    page.wait_for_timeout(350)
    pb = page.evaluate("""() => {const p=document.querySelector('#dock .og-notch-panel');
        if(!p||p.hidden) return null; const r=p.getBoundingClientRect();
        return {x:Math.round(r.x), right:Math.round(r.right)};}""")
    check("el panel se despliega hacia el interior", pb and pb["x"] > 40, pb)
    page.mouse.move(720, 600)
    page.wait_for_timeout(400)

    # --- 6. Vuelta izquierda → arriba ---
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(1100)
    b3 = box(page)
    check("vuelve arriba", b3 and b3["edge"] == "top", b3)

    # --- 7. Teclado ---
    page.keyboard.press("Tab")
    page.keyboard.press("Tab")
    focus = page.evaluate("() => document.activeElement.className")
    page.focus("#dock .og-notch-toggle")
    page.keyboard.press("Enter")
    page.wait_for_timeout(250)
    check("Enter abre el panel", page.locator("#dock .og-notch-panel").is_visible())
    page.keyboard.press("Tab")
    check("Tab entra en las opciones",
          page.evaluate("() => !!document.activeElement.closest('.og-notch-panel')"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(250)
    check("Escape cierra", not page.locator("#dock .og-notch-panel").is_visible())
    check("Escape devuelve el foco al botón",
          page.evaluate("() => document.activeElement.classList.contains('og-notch-toggle')"))

    # --- 8. No se mueve mientras se usa con teclado ---
    page.focus("#dock .og-notch-toggle")
    page.keyboard.press("Enter")
    page.evaluate("window.scrollTo(0, 900)")
    page.wait_for_timeout(700)
    check("no se mueve bajo un usuario de teclado",
          page.evaluate("() => document.getElementById('dock').dataset.edge") == "top")
    page.keyboard.press("Escape")

    # --- 9. Sin scroll horizontal ---
    for w in (320, 375, 820, 1024, 1440):
        page.set_viewport_size({"width": w, "height": 800})
        page.wait_for_timeout(300)
        sw = page.evaluate("() => document.documentElement.scrollWidth")
        check(f"sin scroll horizontal a {w}px", sw <= w + 1, f"scrollWidth={sw}")

    # --- 10. Móvil: toque ---
    ctx2 = browser.new_context(viewport={"width": 393, "height": 852},
                               has_touch=True, is_mobile=True)
    m = ctx2.new_page()
    m.goto(f"{BASE}/index.html", wait_until="networkidle")
    m.tap("#dock .og-notch-toggle")
    m.wait_for_timeout(300)
    check("móvil: un toque abre", m.locator("#dock .og-notch-panel").is_visible())
    mb = m.evaluate("""() => {const t=document.querySelector('#dock .og-notch-toggle');
        const r=t.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};}""")
    check("móvil: superficie táctil >=44px", mb["w"] >= 44 and mb["h"] >= 44, mb)
    m.tap("body", position={"x": 200, "y": 700})
    m.wait_for_timeout(300)
    check("móvil: tocar fuera cierra", not m.locator("#dock .og-notch-panel").is_visible())
    m.evaluate("window.scrollTo(0, 900)")
    m.wait_for_timeout(1100)
    check("móvil: el destino sigue siendo la izquierda",
          m.evaluate("() => document.getElementById('dock').dataset.edge") == "left")
    ctx2.close()

    # --- 11. Movimiento reducido ---
    ctx3 = browser.new_context(viewport={"width": 1440, "height": 900},
                               reduced_motion="reduce")
    r = ctx3.new_page()
    r.goto(f"{BASE}/index.html", wait_until="networkidle")
    r.evaluate("window.scrollTo(0, 900)")
    r.wait_for_timeout(500)
    check("movimiento reducido: llega igualmente a la izquierda",
          r.evaluate("() => document.getElementById('dock').dataset.edge") == "left")
    check("movimiento reducido: la navegación sigue ahí",
          r.locator("#dock .og-notch-item").count() == 7)
    ctx3.close()

    # --- 12. El notch está en las cinco páginas y marca la activa ---
    for f, key in [("index.html", "home"), ("work.html", "work"),
                   ("services.html", "services"), ("about.html", "studio"),
                   ("contact.html", "contact")]:
        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto(f"{BASE}/{f}", wait_until="networkidle")
        cur = page.evaluate("""() => {const a=document.querySelector('#dock [aria-current="page"]');
            return a ? a.dataset.ogKey : null;}""")
        check(f"{f}: notch presente y página activa correcta", cur == key, f"aria-current={cur}")

    check("sin errores de JavaScript", not errors, errors[:3])
    browser.close()

ok = sum(1 for r in results if r["ok"])
print(f"\n{ok}/{len(results)} comprobaciones superadas")
json.dump(results, open("/tmp/claude-0/-home-claude/4e195ff9-b257-56a5-94cc-dc87fbd52317/scratchpad/res_notch.json", "w"), indent=1, ensure_ascii=False)
sys.exit(0 if ok == len(results) else 1)
