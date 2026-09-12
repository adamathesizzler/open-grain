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

  // Studio-section aura: as the dark "Studio" section travels through the
  // viewport, drive --sy from 0 -> 1 so the two glows in its ::before
  // (see styles.css) drift and brighten — the "camera moves through the
  // background" effect asked for, instead of a static flat fill. Reduced
  // motion gets a fixed mid-value aura (still visible, never animating).
  var studioSection = document.querySelector('.studio-section');
  if (studioSection) {
    if (reduced) {
      studioSection.style.setProperty('--sy', '0.5');
    } else {
      var syTicking = false;
      var updateStudioAura = function () {
        var rect = studioSection.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        // progress 0 when the section's top just enters the bottom of the
        // viewport, 1 when its bottom reaches the top — covers the whole
        // time it's on screen, not just a narrow band.
        var total = rect.height + vh;
        var traveled = vh - rect.top;
        var progress = total > 0 ? traveled / total : 0;
        progress = Math.max(0, Math.min(1, progress));
        studioSection.style.setProperty('--sy', progress.toFixed(4));
        syTicking = false;
      };
      window.addEventListener('scroll', function () {
        if (!syTicking) { requestAnimationFrame(updateStudioAura); syTicking = true; }
      }, { passive: true });
      window.addEventListener('resize', function () {
        if (!syTicking) { requestAnimationFrame(updateStudioAura); syTicking = true; }
      }, { passive: true });
      updateStudioAura();
    }
  }

  // Magnetic buttons: primary CTAs nudge toward the pointer while hovered
  // (a subtle nod to the reference video's mouse-driven interactions), and
  // still snap back on leave. Combines the magnetic translate with the
  // existing CSS :active press-scale by writing both into one inline
  // transform, so the two never fight each other. Skipped entirely on
  // touch/coarse pointers (no hover to drive it) and under reduced motion.
  function initMagnetic(el, strength) {
    if (!el || reduced) return;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    strength = strength || 0.28;
    var pressed = false;
    var raf = null;
    var applyTransform = function (tx, ty) {
      var scale = pressed ? 0.96 : 1;
      el.style.transform = 'translate(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px) scale(' + scale + ')';
    };
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var tx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      var ty = (e.clientY - (rect.top + rect.height / 2)) * strength;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { applyTransform(tx, ty); });
    });
    el.addEventListener('mouseleave', function () {
      pressed = false;
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
    });
    el.addEventListener('mousedown', function () {
      pressed = true;
    });
    window.addEventListener('mouseup', function () {
      if (pressed) { pressed = false; }
    });
  }

  document.querySelectorAll('.glass-cta, .submit-btn').forEach(function (el) {
    initMagnetic(el);
  });
})();
