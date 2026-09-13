"""Matriz final: idiomas, temas, anchos, recarga, atrás y aviso de cookies."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8777"
PAGES = ["index.html", "work.html", "services.html", "about.html", "contact.html"]
SIZES = [(320, 640), (375, 812), (393, 852), (820, 1180), (1024, 768), (1440, 900),
         (812, 375), (1180, 820)]
results = []


def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": str(detail)})
    if not ok:
        print("  FALLA " + name + (f"  [{detail}]" if detail else ""))
    return ok


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # --- Matriz idioma × tema × página ---
    for lang in ("en", "es"):
        for theme in ("light", "dark"):
            ctx = browser.new_context(viewport={"width": 1280, "height": 800})
            ctx.add_init_script(
                f"try{{localStorage.setItem('og_lang','{lang}');"
                f"localStorage.setItem('og_theme','{theme}');"
                f"localStorage.setItem('og_cookie_consent','rejected');}}catch(e){{}}")
            p = ctx.new_page()
            errs = []
            p.on("pageerror", lambda e: errs.append(str(e)))
            for f in PAGES:
                p.goto(f"{BASE}/{f}", wait_until="networkidle")
                p.wait_for_timeout(300)
                tag = f"{lang}/{theme}/{f}"
                check(f"{tag}: idioma aplicado",
                      p.evaluate("() => document.documentElement.lang") == lang)
                check(f"{tag}: tema aplicado",
                      p.evaluate("() => document.getElementById('site-shell')"
                                 ".classList.contains('dark-mode')") == (theme == "dark"))
                check(f"{tag}: notch presente",
                      p.locator("#dock .og-notch-toggle").count() == 1)
                check(f"{tag}: sin errores de JavaScript", not errs, errs[:1])
                errs.clear()
            ctx.close()

    # --- Anchos, vertical y horizontal ---
    ctx = browser.new_context()
    p = ctx.new_page()
    for w, h in SIZES:
        p.set_viewport_size({"width": w, "height": h})
        for f in PAGES:
            p.goto(f"{BASE}/{f}", wait_until="networkidle")
            p.wait_for_timeout(220)
            sw = p.evaluate("() => document.documentElement.scrollWidth")
            check(f"{w}x{h} {f}: sin scroll horizontal", sw <= w + 1, sw)
            b = p.evaluate("""() => {const t=document.querySelector('#dock .og-notch-toggle');
                if(!t) return null; const r=t.getBoundingClientRect();
                return {x:r.x,y:r.y,w:r.width,h:r.height};}""")
            check(f"{w}x{h} {f}: el notch está dentro de la pantalla",
                  b and b["x"] >= -2 and b["y"] >= -2 and b["x"] + b["w"] <= w + 2, b)
            check(f"{w}x{h} {f}: superficie táctil suficiente",
                  b and min(b["w"], b["h"]) >= 44, b)
    ctx.close()

    # --- Recarga a mitad de página y botón Atrás ---
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    p = ctx.new_page()
    p.goto(f"{BASE}/work.html", wait_until="networkidle")
    p.evaluate("window.scrollTo(0, 1200)")
    p.wait_for_timeout(1000)
    check("recarga a mitad de página: el notch arranca ya a la izquierda",
          p.evaluate("() => document.getElementById('dock').dataset.edge") == "left")
    p.reload(wait_until="networkidle")
    p.wait_for_timeout(900)
    check("tras recargar sigue coherente con el scroll restaurado",
          p.evaluate("""() => {const e=document.getElementById('dock').dataset.edge;
              return scrollY > 120 ? e === 'left' : e === 'top';}"""))
    p.goto(f"{BASE}/services.html", wait_until="networkidle")
    p.go_back(wait_until="networkidle")
    p.wait_for_timeout(800)
    check("botón Atrás: el notch se remonta sin duplicarse",
          p.locator("#dock .og-notch-toggle").count() == 1)

    # --- Scroll rápido de ida y vuelta sin quedarse a medias ---
    p.goto(f"{BASE}/work.html", wait_until="networkidle")
    for y in (900, 0, 1400, 0, 1100):
        p.evaluate(f"window.scrollTo(0, {y})")
        p.wait_for_timeout(90)
    p.wait_for_timeout(1600)
    check("scroll rápido: acaba en el lado correcto",
          p.evaluate("""() => {const e=document.getElementById('dock').dataset.edge;
              return scrollY > 120 ? e === 'left' : e === 'top';}"""),
          p.evaluate("() => document.getElementById('dock').dataset.edge + ' @' + Math.round(scrollY)"))
    ctx.close()

    # --- El aviso de cookies no tapa acciones ---
    ctx = browser.new_context(viewport={"width": 393, "height": 852}, has_touch=True, is_mobile=True)
    p = ctx.new_page()
    p.goto(f"{BASE}/contact.html", wait_until="networkidle")
    p.wait_for_timeout(600)
    check("aviso de cookies: aparece", p.locator("#cookie-banner").is_visible())
    for bid in ("#cookie-accept", "#cookie-reject"):
        bb = p.locator(bid).bounding_box()
        check(f"aviso de cookies: {bid} llega a 44px", bb and bb["height"] >= 44, bb)
    p.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    p.wait_for_timeout(400)
    banner = p.locator("#cookie-banner").bounding_box()
    submit = p.locator("#submit-btn").bounding_box()
    overlap = submit and banner and not (submit["y"] + submit["height"] <= banner["y"])
    check("aviso de cookies: no tapa el botón de enviar", not overlap,
          f"enviar={submit} aviso={banner}")
    p.click("#cookie-reject")
    p.wait_for_timeout(300)
    check("aviso de cookies: se puede descartar", p.locator("#cookie-banner").count() == 0)
    ctx.close()

    # --- Almacenamiento bloqueado: la web no se cae ---
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_init_script("""
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('bloqueado', 'SecurityError'); }
      });""")
    p = ctx.new_page()
    errs = []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.goto(f"{BASE}/contact.html", wait_until="networkidle")
    p.wait_for_timeout(500)
    check("sin acceso a localStorage: la página sigue funcionando",
          p.locator("#dock .og-notch-toggle").count() == 1 and not errs, errs[:1])
    ctx.close()

    browser.close()

ok = sum(1 for r in results if r["ok"])
print(f"\n{ok}/{len(results)} comprobaciones superadas")
json.dump(results, open("/tmp/claude-0/-home-claude/4e195ff9-b257-56a5-94cc-dc87fbd52317/scratchpad/res_matrix.json", "w"), indent=1, ensure_ascii=False)
sys.exit(0 if ok == len(results) else 1)
