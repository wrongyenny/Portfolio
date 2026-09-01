/* ═══════════════════════════════════════════════════════════════════════
   CURSOR GLOW — a soft circular gradient that swims after the pointer.

   Mounted on any section that has a gradient worth disturbing. The blob
   chases with heavy easing plus a slow figure-eight drift, so it lags and
   overshoots instead of feeling glued to the mouse.

   Two things make it read correctly:

   1. TWO BLEND LAYERS. A section gradient usually spans light to dark, and
      no single blend mode survives that range — `multiply` tints the light
      end but dies on the dark end, `screen` glows the dark end but washes
      out on the light one. Running one of each gives a coloured lens that
      stays visible the whole way down.

   2. EDGE FALLOFF. The host clips the blob at its own bounds, which showed
      as a hard straight cut whenever the pointer neared a boundary. So the
      blob now dims and shrinks as it approaches any edge and is fully out
      by the time it reaches one — the light falls off instead of being
      sliced. This is also what keeps it from spilling into neighbouring
      sections on hosts that aren't clipped at all.
═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var EASE    = 0.075;  // chase laziness — lower drifts more
  var DRIFT   = 26;     // idle wander amplitude, px
  var FADE_IN = 0.055;  // opacity ramp per frame
  var FADE_OUT= 0.10;   // faster on the way out so it doesn't linger at an edge

  /* Warm pink — for the footer's lavender → sage → near-black ramp. */
  var PINK = [
    ['multiply',
      'rgba(255,171,201,0.60) 0%,rgba(255,186,209,0.44) 30%,' +
      'rgba(255,206,224,0.24) 55%,rgba(255,224,236,0.09) 76%,rgba(255,255,255,0) 100%'],
    ['screen',
      'rgba(214,120,166,0.70) 0%,rgba(190,102,150,0.50) 30%,' +
      'rgba(160,84,130,0.28) 55%,rgba(130,66,108,0.10) 76%,rgba(0,0,0,0) 100%']
  ];

  /* Blush #FFCBDF — the landing glow.

     `screen` carries this one rather than `color`. The swatch is a pale,
     low-contrast pink (HSL 337° 100% 90%) and `color` throws lightness
     away, keeping only hue and saturation — on the hero's band, which is
     already pink at 329°, that lands as a lurid hot-pink patch instead of
     the soft colour actually chosen. `screen` blooms toward the swatch and
     keeps its paleness. The `color` layer stays underneath at low strength
     to carry the hue across the cream areas, where screen has little to
     lift.

     Note also why neither layer is `multiply`: on a flat mid-tone like the
     hero's band, multiply and screen of the same hue pull opposite ways and
     very nearly cancel. */
  var BLUSH = [
    ['color',
      'rgba(255,203,223,0.42) 0%,rgba(255,203,223,0.31) 32%,' +
      'rgba(255,203,223,0.18) 56%,rgba(255,203,223,0.06) 78%,rgba(255,203,223,0) 100%'],
    ['screen',
      'rgba(255,203,223,0.86) 0%,rgba(252,190,214,0.62) 32%,' +
      'rgba(240,166,196,0.34) 56%,rgba(220,140,175,0.12) 78%,rgba(0,0,0,0) 100%']
  ];

  function mountGlow(host, layers, sizeCss) {
    var blobs = layers.map(function (spec) {
      var el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.className = 'cursor-glow';
      el.style.cssText =
        'position:absolute;top:0;left:0;z-index:-1;pointer-events:none;' +
        'width:' + sizeCss + ';aspect-ratio:1;border-radius:50%;' +
        'opacity:0;will-change:transform,opacity;mix-blend-mode:' + spec[0] + ';' +
        'background:radial-gradient(circle closest-side,' + spec[1] + ');';
      host.appendChild(el);
      return el;
    });

    var w = 0, h = 0, size = 0;
    function measure() {
      var r = host.getBoundingClientRect();
      w = r.width; h = r.height;
      size = blobs[0].offsetWidth || 420;
    }
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(host);
    else window.addEventListener('resize', measure);

    var tx = w / 2, ty = h / 2;
    var x = tx, y = ty;
    var opacity = 0, want = 0, scale = 1, wantScale = 1;
    var running = false, t0 = 0;

    /* 1 in the middle of the host, easing to 0 within half a blob-width of
       any edge. Squared so the blob holds full strength across most of the
       section and only gives way close in. */
    function edgeFalloff(px, py) {
      var zone = Math.max(80, size * 0.5);
      var d = Math.min(px, py, w - px, h - py);
      if (d >= zone) return 1;
      if (d <= 0) return 0;
      var t = d / zone;
      return t * t;
    }

    /* Driven from a single document-level listener rather than one bound to
       the host, and hit-tested against the host's rect. Elements that sit
       over a section without being inside it — the hero's fixed wordmark,
       for one — otherwise swallow the pointer events and the glow simply
       never fires. */
    function aim(clientX, clientY) {
      var r = host.getBoundingClientRect();
      var px = clientX - r.left;
      var py = clientY - r.top;
      var inside = px >= 0 && py >= 0 && px <= r.width && py <= r.height;
      if (!inside) { want = 0; wantScale = 0.72; start(); return; }
      tx = px; ty = py;
      var f = edgeFalloff(px, py);
      want = f;
      wantScale = 0.72 + f * 0.28;   // shrinks as it dims, so it recedes
      start();
    }

    function start() {
      if (running) return;
      running = true;
      t0 = performance.now();
      requestAnimationFrame(frame);
    }

    function frame(now) {
      var t = (now - t0) / 1000;
      var wx = Math.sin(t * 0.55) * DRIFT;
      var wy = Math.sin(t * 0.83) * DRIFT * 0.7;

      x += (tx + wx - x) * EASE;
      y += (ty + wy - y) * EASE;

      opacity += (want - opacity) * (want > opacity ? FADE_IN : FADE_OUT);
      scale   += (wantScale - scale) * 0.10;

      var op = opacity.toFixed(3);
      var tf = 'translate3d(' + (x - size / 2) + 'px,' + (y - size / 2) + 'px,0)' +
               ' scale(' + scale.toFixed(3) + ')';
      for (var i = 0; i < blobs.length; i++) {
        blobs[i].style.opacity = op;
        blobs[i].style.transform = tf;
      }

      if (opacity > 0.004 || want > 0.004) requestAnimationFrame(frame);
      else {
        running = false;
        for (var j = 0; j < blobs.length; j++) blobs[j].style.opacity = '0';
      }
    }

    return aim;
  }

  var aims = [];
  function add(sel, layers, size) {
    var el = document.querySelector(sel);
    if (el) aims.push(mountGlow(el, layers, size));
  }

  add('.footer', PINK, 'clamp(280px,42vw,620px)');
  // Landing only — these selectors don't exist on the other pages.
  add('.hero',   BLUSH, 'clamp(260px,36vw,540px)');
  add('.intro',  BLUSH, 'clamp(260px,38vw,560px)');

  if (!aims.length) return;

  var lx = 0, ly = 0, seen = false;
  function dispatch() { for (var i = 0; i < aims.length; i++) aims[i](lx, ly); }

  document.addEventListener('pointermove', function (e) {
    lx = e.clientX; ly = e.clientY; seen = true;
    dispatch();
  }, { passive: true });

  // Scrolling moves the sections under a stationary cursor.
  window.addEventListener('scroll', function () { if (seen) dispatch(); }, { passive: true });

  document.addEventListener('pointerleave', function () {
    lx = -9999; ly = -9999; dispatch();
  });
})();
