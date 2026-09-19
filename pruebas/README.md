# Pruebas de regresión — OPEN GRAIN

Suites sobre el sitio completo con Playwright y Chromium. No tocan
Supabase ni producción: el envío del formulario se prueba contra un doble del
cliente que se instala antes de `main.js`, de modo que sí se ejercita el camino
real del sitio (validación, mapeo de servicio y presupuesto, estados del botón).

## Ejecutar

Desde la raíz del repositorio:

```bash
python3 pruebas/servidor_limpio.py . 8777 &   # sirve el sitio con URLs limpias, como Vercel
python3 pruebas/test_auditoria.py      # 197 — auditoría UX/UI y barra inferior estilo Pinterest
python3 pruebas/test_formulario.py     # 38  — validación, envío, errores, conservación de datos
python3 pruebas/test_paginas.py        # 60  — (antigua: espera la portada con titular de la 0n, revertida)
python3 pruebas/test_matriz.py         # 210 — (antigua: espera el notch, sustituido por la barra)
```

Cada suite imprime PASA/FALLA por comprobación, deja un JSON con los resultados
y termina con código 1 si alguna falla.

Requisitos: Python 3, `playwright` y Chromium disponible.

## Lo que estas pruebas NO demuestran

No prueban Supabase real, ni Safari/WebKit, ni lectores de pantalla, ni
dispositivos físicos, ni las políticas RLS, ni que una solicitud llegue a
verse en Studio. Eso sigue pendiente de comprobar con acceso al proyecto.

`test_notch.py` se ha retirado junto con el notch (sustituido por la barra
inferior en la sesión 0q). `test_formulario.py` está al día: cambia el idioma
con el botón de arriba a la derecha y acepta las columnas de consentimiento.
