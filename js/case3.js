/* Case-study three-column layout: keep pinned columns reachable.
   If a pinned block is taller than the viewport, let it scroll until its
   bottom is visible, then pin it there (instead of cutting the text off). */
(function () {
  var pinned = [];
  function fit() {
    var wide = window.matchMedia('(min-width: 1101px)').matches;
    var gap = 24;
    var nav = document.querySelector('.nav-sticky-wrap');
    var base = nav ? nav.offsetHeight : 80;
    pinned.forEach(function (el) {
      if (!wide) { el.style.top = ''; return; }
      var top = base + gap;
      var over = el.offsetHeight + top + gap - window.innerHeight;
      el.style.top = (over > 0 ? top - over : top) + 'px';
    });
  }
  function init() {
    pinned = [].slice.call(document.querySelectorAll('.case3-side, .case3-text'));
    if (!pinned.length) return;
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(fit);
      pinned.forEach(function (el) { ro.observe(el); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
