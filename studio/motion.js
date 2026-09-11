/* ---------- Studio motion layer ----------
   Same idea as the public site's assets/motion.js: the topbar materializes
   (translucent blur + edge shadow) only once content has actually
   scrolled under it, instead of carrying a permanent hard divider. Purely
   additive — never touches app state, so it can't break the dashboard. */
(function () {
  var topbar = document.querySelector('.og-topbar');
  if (!topbar) return;
  var ticking = false;
  var update = function () {
    topbar.classList.toggle('scrolled', window.scrollY > 8);
    ticking = false;
  };
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();
