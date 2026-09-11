/* ---------- Apple-style motion layer ----------
   Small, dependency-free additions that make the static page feel alive
   per the fluid-interfaces principles: scroll reveal on section entry,
   and a nav that reacts to scroll context (materializes/compacts) instead
   of sitting static. Everything here only ever ADDS a class — it never
   blocks input or delays first paint, and it fully respects
   prefers-reduced-motion (the CSS side turns the transform off; this file
   still adds .is-visible immediately so content is never stuck hidden). */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal: every below-the-fold section fades / rises into place
  // the first time it enters the viewport, then is left alone — a one-way
  // reveal, not a repeating scroll-jack. The [data-reveal] attribute is
  // set directly in the HTML (not here) so the hidden starting state is
  // present at first paint — adding it only after JS runs would flash the
  // section visible-then-hidden-then-visible. The hero is excluded: it
  // already has its own bespoke entrance choreography in CSS.
  var revealTargets = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Nav material: compacts and deepens its blur once the page has scrolled
  // past the hero meta, so the chrome reads as reacting to context (a
  // "scroll edge effect") rather than a fixed opaque bar.
  var nav = document.querySelector('.glass-nav');
  if (nav) {
    var ticking = false;
    var updateNav = function () {
      nav.classList.toggle('scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(updateNav); ticking = true; }
    }, { passive: true });
    updateNav();
  }
})();
