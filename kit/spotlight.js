/* ==========================================================================
   iara staff kit: spotlight for STATIC apps. Vanilla JS, no deps.
   Needs staff.css (.k-spotlight). Use:
     <div class="k-card k-spotlight">...</div>
     <script src="/kit/spotlight.js" defer></script>
   Sets --x/--y (px, relative to the card) on pointermove and [data-lit] while
   a mouse/pen is over it. Touch is ignored; staff.css also keeps the glow off
   for coarse pointers and prefers-reduced-motion. Cards added later work too
   (one delegated listener).
   ========================================================================== */
(function () {
  if (window.iaraSpotlight) return;
  var lit = null, raf = 0, px = 0, py = 0;
  function paint() {
    raf = 0;
    if (!lit) return;
    var r = lit.getBoundingClientRect();
    lit.style.setProperty("--x", Math.round(px - r.left) + "px");
    lit.style.setProperty("--y", Math.round(py - r.top) + "px");
  }
  function off() { if (lit) lit.removeAttribute("data-lit"); lit = null; }
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var c = e.target && e.target.closest ? e.target.closest(".k-spotlight") : null;
    if (c !== lit) { off(); if (c) { lit = c; c.setAttribute("data-lit", ""); } }
    if (!lit) return;
    px = e.clientX; py = e.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", off);
  window.iaraSpotlight = { version: 1 };
})();
