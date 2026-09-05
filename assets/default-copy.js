// ============================================================
// OPEN GRAIN — default marketing copy (single source of truth)
// Used by both the public site (main.js) and the Studio panel's
// "Site content" editor (studio.js) so the two never drift apart.
//
// These are the FALLBACK values shown when there is no override in
// the `site_content` Supabase table yet. Once Adama edits a field
// from Studio → Site content (or approves an AI suggestion), the
// override in `site_content` takes priority over these defaults —
// the public site always prefers the database value when one exists.
// ============================================================
window.DEFAULT_COPY = {
  en: {
    eyebrow: 'Creative production studio · Mallorca',
    headline: 'Ideas without limits. Stories with texture.',
    explore: 'Explore work',
    workBlurb: 'Photography, stories and campaigns created in Mallorca.',
    intro: 'Creating what words can’t explain.',
    introBody: 'Photography, film and digital content shaped around people, places and brands.',
    capabilities: 'What we create',
    serviceList: ['Photography', 'Film & Reels', 'UGC', 'Events', 'Social Content'],
    about: 'Made with intention. Told with feeling.',
    aboutBody: 'OPEN GRAIN is an independent creative studio based in Mallorca. We build visual stories with an honest eye, careful craft and a little grain.',
    studioTag: 'Visuals with something to say.',
    cta: 'Tell us what you want to create.',
    ctaLede: 'Tell us what you need and we’ll reply with availability and next steps.',
    based: 'Based in Mallorca · Available across the island',
    socialLede: 'Posts can be selected from the studio panel.',
  },
  es: {
    eyebrow: 'Estudio de producción creativa · Mallorca',
    headline: 'Ideas sin límites. Historias con textura.',
    explore: 'Ver proyectos',
    workBlurb: 'Fotografía, historias y campañas creadas en Mallorca.',
    intro: 'Creamos lo que las palabras no pueden explicar.',
    introBody: 'Fotografía, vídeo y contenido digital creado alrededor de personas, lugares y marcas.',
    capabilities: 'Lo que creamos',
    serviceList: ['Fotografía', 'Vídeo y reels', 'UGC', 'Eventos', 'Contenido para redes'],
    about: 'Hecho con intención. Contado con emoción.',
    aboutBody: 'OPEN GRAIN es un estudio creativo independiente de Mallorca. Construimos historias visuales con una mirada honesta, oficio y un poco de grano.',
    studioTag: 'Visuales con algo que contar.',
    cta: 'Cuéntanos qué quieres crear.',
    ctaLede: 'Dinos qué necesitas y te responderemos con disponibilidad y próximos pasos.',
    based: 'En Mallorca · Disponibles en toda la isla',
    socialLede: 'Las publicaciones podrán elegirse desde el panel.',
  },
};

// Human-readable labels for the Studio "Site content" editor, shown
// next to each field so Adama knows what he's editing without
// needing to know the internal key names.
window.CONTENT_FIELD_LABELS = {
  eyebrow: 'Etiqueta pequeña sobre el titular principal',
  headline: 'Titular principal (portada)',
  explore: 'Texto del botón "Ver proyectos"',
  workBlurb: 'Frase bajo "Trabajos seleccionados"',
  intro: 'Titular de la sección "Creamos lo que..."',
  introBody: 'Texto de la sección "Creamos lo que..."',
  capabilities: 'Título de la sección "Servicios"',
  about: 'Titular de la sección "Estudio"',
  aboutBody: 'Texto de la sección "Estudio"',
  studioTag: 'Frase pequeña junto al icono (sección Estudio)',
  cta: 'Titular de la sección "Contacto"',
  ctaLede: 'Frase bajo el titular de "Contacto"',
  based: 'Frase del pie de página ("En Mallorca...")',
  socialLede: 'Frase bajo "Lo último del estudio"',
};

// Order in which fields are shown in the editor (mirrors page order).
window.CONTENT_FIELD_ORDER = [
  'eyebrow', 'headline', 'explore', 'workBlurb',
  'intro', 'introBody', 'capabilities',
  'about', 'aboutBody', 'studioTag',
  'cta', 'ctaLede', 'based', 'socialLede',
];
