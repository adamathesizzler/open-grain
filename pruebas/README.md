# Pruebas de regresión — OPEN GRAIN

Cuatro suites sobre el sitio completo con Playwright y Chromium. No tocan
Supabase ni producción: el envío del formulario se prueba contra un doble del
cliente que se instala antes de `main.js`, de modo que sí se ejercita el camino
real del sitio (validación, mapeo de servicio y presupuesto, estados del botón).

## Ejecutar

Desde la raíz del repositorio:

```bash
python3 -m http.server 8777 &          # sirve el sitio en el puerto que esperan las pruebas
python3 pruebas/test_notch.py          # 38  — recorrido arriba → izquierda, hover, toque, teclado
python3 pruebas/test_formulario.py     # 39  — validación, envío, errores, conservación de datos
python3 pruebas/test_paginas.py        # 60  — portada, servicios, contacto, vista ampliada, a11y
python3 pruebas/test_matriz.py         # 210 — ES/EN × claro/oscuro × 5 páginas × 8 tamaños
```

Cada suite imprime PASA/FALLA por comprobación, deja un JSON con los resultados
y termina con código 1 si alguna falla.

Requisitos: Python 3, `playwright` y Chromium disponible.

## Lo que estas pruebas NO demuestran

No prueban Supabase real, ni Safari/WebKit, ni lectores de pantalla, ni
dispositivos físicos, ni las políticas RLS, ni que una solicitud llegue a
verse en Studio. Eso sigue pendiente de comprobar con acceso al proyecto.
