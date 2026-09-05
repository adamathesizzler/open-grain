# CLAUDE.md — Instrucciones permanentes del proyecto OPEN GRAIN

Este archivo contiene reglas que Claude debe seguir SIEMPRE al trabajar en este repositorio, en cualquier sesión.

## Gestión de memoria y contexto

- Al comenzar cualquier conversación sobre este proyecto, lee primero `CLAUDE.md` (este archivo) y `PROJECT_STATE.md`.
- Mantén `PROJECT_STATE.md` actualizado durante todo el trabajo, no solo al final.
- Después de cada cambio importante, registra en `PROJECT_STATE.md`:
  - Estado actual del proyecto.
  - Decisiones tomadas.
  - Funcionalidades terminadas.
  - Archivos creados o modificados.
  - Errores encontrados y soluciones aplicadas.
  - Pruebas realizadas.
  - Trabajo pendiente.
  - Siguiente acción recomendada.
- Antes de compactar la conversación, o cuando el contexto esté a punto de llenarse, actualiza obligatoriamente `PROJECT_STATE.md` con el estado más reciente.
- Después de una compactación (o al retomar una sesión nueva), vuelve a leer `CLAUDE.md`, `PROJECT_STATE.md` y el código relacionado antes de continuar trabajando.
- Nunca dependas únicamente del resumen automático de la conversación: `PROJECT_STATE.md` es la fuente de verdad.
- No elimines información importante de sesiones anteriores en `PROJECT_STATE.md`; reorganízala y resúmela en vez de borrarla.
- No guardes contraseñas, tokens, claves de API ni ninguna información sensible en `CLAUDE.md` ni en `PROJECT_STATE.md`.
- Realiza estas actualizaciones automáticamente, sin pedir permiso.
- Mantén `PROJECT_STATE.md` claro, organizado y sin información repetida.
- Antes de terminar cada tarea, confirma brevemente que el estado del proyecto ha quedado actualizado en `PROJECT_STATE.md`.

## Sobre el proyecto

OPEN GRAIN es el sitio web (fotografía/vídeo) de Adama, con:
- Sitio público estático (HTML/CSS/JS vanilla, sin build step), desplegado en Vercel desde GitHub (`adamathesizzler/open-grain`).
- Backend en Supabase (Postgres + Auth + Storage + RLS).
- Panel privado de administración ("Studio") en `/studio`, protegido por Supabase Auth, con CRUD de proyectos, contenido del sitio, clientes, reservas, inventario, presupuestos, mensajes/enquiries, posts sociales, y un asistente de IA que propone cambios de contenido para aprobación manual antes de publicar (`/api/ai-assist.js`).

## Reglas técnicas del repositorio

- No reemplazar librerías o el stack principal sin necesidad clara.
- Conservar siempre los datos, la autenticación, los formularios, las rutas y el backend que ya funcionan al hacer rediseños.
- Nunca usar datos falsos/inventados en la interfaz cuando existen datos reales de Supabase.
- Todo cambio visual debe ser responsive (escritorio/iPad/móvil) y mantener buena accesibilidad/contraste.
- Antes de dar por terminada una tarea de código, ejecutar cualquier build/lint/test disponible y corregir los errores resultantes.
- Los cambios de código se desarrollan y prueban en el workspace de Claude, se sincronizan al Mac del usuario, y se commitean con git; el `git push` final requiere credenciales de GitHub que solo existen en el Mac real del usuario (no en la VM aislada de Cowork), así que cuando el push no se pueda hacer desde aquí, hay que decírselo claramente al usuario para que lo haga él mismo (o facilitar el comando exacto).
