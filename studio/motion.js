/* ---------- Studio motion layer ----------
   Same idea as the public site's assets/motion.js: the topbar materializes
   (translucent blur + edge shadow) only once content has actually
   scrolled under it, instead of carrying a permanent hard divider. Purely
   additive — never touches app state, so it can't break the dashboard. */
(function () {
  var topbar = document.querySelector('.og-topbar');
  if (topbar) {
    var ticking = false;
    var update = function () {
      topbar.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // Magnetic sign-in button: same helper as the public site's CTA/submit
  // buttons (assets/motion.js) — nudges toward the pointer on hover, keeps
  // the existing press-scale feedback, skipped on touch and under
  // reduced-motion.
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var loginBtn = document.querySelector('.login-submit');
  if (loginBtn && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var strength = 0.28;
    var pressed = false;
    var raf = null;
    var applyTransform = function (tx, ty) {
      var scale = pressed ? 0.96 : 1;
      loginBtn.style.transform = 'translate(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px) scale(' + scale + ')';
    };
    loginBtn.addEventListener('mousemove', function (e) {
      var rect = loginBtn.getBoundingClientRect();
      var tx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      var ty = (e.clientY - (rect.top + rect.height / 2)) * strength;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { applyTransform(tx, ty); });
    });
    loginBtn.addEventListener('mouseleave', function () {
      pressed = false;
      if (raf) cancelAnimationFrame(raf);
      loginBtn.style.transform = '';
    });
    loginBtn.addEventListener('mousedown', function () { pressed = true; });
    window.addEventListener('mouseup', function () { if (pressed) pressed = false; });
  }
})();
