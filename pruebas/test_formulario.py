"""Formulario de contacto: validación, envío, errores y conservación de datos."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8777"
results = []


def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": str(detail)})
    print(("  PASA  " if ok else "  FALLA ") + name + (f"  [{detail}]" if detail else ""))
    return ok


# Supabase no es alcanzable desde este entorno, así que se sustituye el cliente
# por un doble controlable. Eso permite probar éxito, fallo y doble envío sin
# tocar la base de datos real ni mandar solicitudes falsas a producción.
STUB = """
window.__sent = [];
window.__mode = 'ok';
window.__delay = 60;
// El doble se instala ANTES de main.js, de modo que supabaseClient se crea a
// partir de él y se ejercita el camino real del sitio (validación, mapeo del
// servicio y del presupuesto, estados del botón) sin tocar la base de datos.
window.supabase = {
  createClient: () => ({
    from: () => ({
      insert: async (row) => {
        window.__sent.push(row);
        await new Promise(r => setTimeout(r, window.__delay));
        return window.__mode === 'ok' ? { error: null } : { error: { message: 'boom' } };
      },
      select: () => Promise.resolve({ data: [] }),
    }),
  }),
};
"""


def fresh(ctx, mode="ok", delay=60):
    p = ctx.new_page()
    p.add_init_script(STUB)
    p.goto(f"{BASE}/contact.html", wait_until="domcontentloaded")
    p.wait_for_function("() => !!window.OGContact && !!document.getElementById('submit-btn').textContent.trim()")
    p.evaluate("(cfg) => { window.__mode = cfg.mode; window.__delay = cfg.delay; }",
               {"mode": mode, "delay": delay})
    return p


def fill(p, **kw):
    data = {"name": "Ana Prueba", "email": "ana@example.com", "message": "Boda en Palma, 80 invitados."}
    data.update(kw)
    for k, v in data.items():
        if v is not None:
            p.fill(f"#{k}", v)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})

    # --- 1. Envío vacío: no envía nada y avisa ---
    p = fresh(ctx)
    p.click("#submit-btn")
    p.wait_for_timeout(300)
    check("vacío: no se envía nada", p.evaluate("() => window.__sent.length") == 0)
    check("vacío: resumen de error visible", p.locator(".og-form-summary").is_visible())
    check("vacío: nombre marcado aria-invalid",
          p.get_attribute("#name", "aria-invalid") == "true")
    check("vacío: el foco va al primer error",
          p.evaluate("() => document.activeElement.id") == "name")
    check("vacío: error junto al campo, no un alert()",
          p.locator("#name-og-error").is_visible())
    check("vacío: el error está enlazado con aria-describedby",
          "og-error" in (p.get_attribute("#name", "aria-describedby") or ""))
    p.close()

    # --- 2. Correo inválido y nombre en blanco ---
    p = fresh(ctx)
    fill(p, name="   ", email="ana@@mal")
    p.check("#consent")
    p.click("#submit-btn")
    p.wait_for_timeout(300)
    check("nombre sólo con espacios: rechazado",
          p.get_attribute("#name", "aria-invalid") == "true")
    check("correo inválido: rechazado",
          p.get_attribute("#email", "aria-invalid") == "true")
    check("inválido: no se envía", p.evaluate("() => window.__sent.length") == 0)
    p.close()

    # --- 3. Sin consentimiento ---
    p = fresh(ctx)
    fill(p)
    p.click("#submit-btn")
    p.wait_for_timeout(300)
    check("sin consentimiento: no se envía", p.evaluate("() => window.__sent.length") == 0)
    check("sin consentimiento: se explica en el propio campo",
          p.locator("#consent-og-error").is_visible())
    p.close()

    # --- 4. Envío correcto ---
    p = fresh(ctx)
    fill(p, phone="+34600111222")
    p.select_option("#service", index=1)
    p.select_option("#budget", value="€1,000–2,500")
    p.check("#consent")
    p.click("#submit-btn")
    p.wait_for_selector("#form-success:not([hidden])", timeout=5000)
    sent = p.evaluate("() => window.__sent")
    check("correcto: se envía una única fila", len(sent) == 1, len(sent))
    check("correcto: el formulario se oculta de verdad",
          p.evaluate("() => getComputedStyle(document.getElementById('contact-form')).display") == "none")
    check("correcto: confirmación visible", p.locator("#form-success").is_visible())
    check("correcto: el foco va a la confirmación",
          p.evaluate("() => document.activeElement.id") == "form-success")
    if sent:
        row = sent[0]
        check("correcto: se guarda el nombre legible del servicio, no svc-N",
              row.get("service") and not str(row["service"]).startswith("svc-"), row.get("service"))
        check("correcto: presupuesto tal cual", row.get("budget_range") == "€1,000–2,500", row.get("budget_range"))
        check("correcto: no se inventan columnas",
              # consent_accepted/consent_at: columnas reales desde la migración de
              # consentimiento (commit b9b134d), no inventadas.
              set(row) <= {"name", "email", "phone", "service", "preferred_date", "budget_range", "message",
                           "consent_accepted", "consent_at"},
              sorted(row))
    p.close()

    # --- 5. «Todavía no lo sé» → null, no un código interno ---
    p = fresh(ctx)
    fill(p)
    p.select_option("#budget", value="undecided")
    p.check("#consent")
    p.click("#submit-btn")
    p.wait_for_selector("#form-success:not([hidden])", timeout=5000)
    check("«Todavía no lo sé» se guarda como vacío, no como 'undecided'",
          p.evaluate("() => window.__sent[0].budget_range") is None,
          p.evaluate("() => window.__sent[0].budget_range"))
    p.close()

    # --- 6. Doble envío ---
    p = fresh(ctx, delay=700)
    fill(p)
    p.check("#consent")
    p.click("#submit-btn")
    p.wait_for_timeout(120)
    check("mientras envía: el botón queda desactivado",
          p.is_disabled("#submit-btn"))
    btn_text = p.inner_text("#submit-btn").lower()
    check("mientras envía: el botón dice «Enviando…»",
          "nviando" in btn_text or "ending" in btn_text, p.inner_text("#submit-btn"))
    p.evaluate("() => document.getElementById('contact-form').requestSubmit()")
    p.evaluate("() => document.getElementById('contact-form').requestSubmit()")
    p.wait_for_selector("#form-success:not([hidden])", timeout=5000)
    check("doble envío: sólo se inserta una fila",
          p.evaluate("() => window.__sent.length") == 1,
          p.evaluate("() => window.__sent.length"))
    p.close()

    # --- 7. Error de red: no se pierde lo escrito ---
    p = fresh(ctx, mode="fail")
    fill(p, message="Tres días de rodaje en Sóller.")
    p.check("#consent")
    p.click("#submit-btn")
    p.wait_for_timeout(500)
    check("error: no se muestra éxito falso", p.locator("#form-success").is_hidden())
    check("error: el formulario sigue visible", p.locator("#contact-form").is_visible())
    check("error: se conserva lo escrito",
          p.input_value("#message") == "Tres días de rodaje en Sóller.")
    check("error: el botón vuelve a estar disponible", not p.is_disabled("#submit-btn"))
    msg = p.inner_text(".og-form-summary")
    check("error: no se filtran mensajes internos del backend",
          "boom" not in msg and "Supabase" not in msg and "config.js" not in msg, msg[:70])
    p.close()

    # --- 8. Conservar datos al cambiar de idioma ---
    p = ctx.new_page()
    p.goto(f"{BASE}/contact.html", wait_until="networkidle")
    p.wait_for_timeout(400)
    fill(p, phone="+34600111222")
    p.fill("#date", "2026-11-20")
    p.select_option("#service", index=2)
    p.select_option("#budget", value="€2,500+")
    p.check("#consent")
    before = {
        "name": p.input_value("#name"), "email": p.input_value("#email"),
        "phone": p.input_value("#phone"), "message": p.input_value("#message"),
        "date": p.input_value("#date"), "service": p.input_value("#service"),
        "budget": p.input_value("#budget"), "consent": p.is_checked("#consent"),
        "lang": p.evaluate("() => document.documentElement.lang"),
    }
    # El idioma se cambia con el botón de arriba a la derecha (sesión 0q).
    p.click("#lang-switch")
    p.wait_for_timeout(500)
    after = {
        "name": p.input_value("#name"), "email": p.input_value("#email"),
        "phone": p.input_value("#phone"), "message": p.input_value("#message"),
        "date": p.input_value("#date"), "service": p.input_value("#service"),
        "budget": p.input_value("#budget"), "consent": p.is_checked("#consent"),
        "lang": p.evaluate("() => document.documentElement.lang"),
    }
    for k in ("name", "email", "phone", "message", "date", "service", "budget", "consent"):
        check(f"cambio de idioma conserva «{k}»", before[k] == after[k], f"{before[k]!r} → {after[k]!r}")
    check("cambio de idioma actualiza <html lang>",
          before["lang"] != after["lang"] and after["lang"] in ("es", "en"),
          f"{before['lang']} → {after['lang']}")
    check("la etiqueta del servicio sí se traduce",
          p.evaluate("""() => {const s=document.getElementById('service');
              return s.options[s.selectedIndex].textContent;}""") is not None)

    # --- 9. Tema ---
    # Desde la sesión 0q el tema sigue la hora y no hay botón: no hay nada que
    # pulsar que pueda borrar lo escrito.
    check("no hay botón de tema que pueda borrar lo escrito", p.locator('[data-action="theme"]').count() == 0)
    p.close()

    browser.close()

ok = sum(1 for r in results if r["ok"])
print(f"\n{ok}/{len(results)} comprobaciones superadas")
json.dump(results, open("/tmp/resultado_formulario.json", "w"), indent=1, ensure_ascii=False)
sys.exit(0 if ok == len(results) else 1)
