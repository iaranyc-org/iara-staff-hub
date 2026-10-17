/* iara staff kit: kitchen loading line (static twin of next/loading.tsx).
   Any [data-k-cook] element, or any .k-skel / .k-skel-cols with aria-busy="true", gets one playful
   kitchen line appended after 200ms, swapping every 1.6s while it stays on the page. The line is
   aria-hidden; the container's own role="status" + .k-sr-only label stays the stable announcement.
   Reduced motion: one line, no wobble, no swapping. Load it without defer if a boot screen needs it. */
(function () {
  if (window.kLoading) return;
  var LINES = ["Lighting the Grill", "Toasting the Farofa", "Squeezing the Limes", "Warming the Pão de Queijo",
    "Polishing the Glasses", "Setting Table 101", "Muddling the Caipirinhas", "Calling Back of House",
    "Tasting for Salt", "Firing Table 12", "Bom Dia, Chef", "Folding the Napkins", "Sharpening the Knives"];
  var HAT = '<svg class="k-cook-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/></svg>';
  var SEL = '[data-k-cook], .k-skel[aria-busy="true"], .k-skel-cols[aria-busy="true"]';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pick(not) { var i = Math.floor(Math.random() * LINES.length); return i === not ? (i + 1) % LINES.length : i; }
  function attach(el) {
    if (el.__kCook) return; el.__kCook = 1;
    var p = document.createElement('p'); p.className = 'k-cook'; p.setAttribute('aria-hidden', 'true');
    el.appendChild(p); // empty but height-reserved, so nothing shifts at 200ms
    setTimeout(function () {
      if (!p.isConnected) return;
      var cur = pick(); p.innerHTML = HAT + '<span></span>'; var s = p.lastChild; s.textContent = LINES[cur];
      if (reduce) return;
      var iv = setInterval(function () {
        if (!p.isConnected) { clearInterval(iv); return; }  // removed: stop
        if (!el.getClientRects().length) return;            // hidden (gate, done): skip, resume if shown again
        cur = pick(cur); s.textContent = LINES[cur];
      }, 1600);
    }, 200);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches(SEL)) attach(root);
    var all = root.querySelectorAll(SEL); for (var i = 0; i < all.length; i++) attach(all[i]);
  }
  window.kLoading = attach;
  scan(document.documentElement);
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) scan(ms[i].addedNodes[j]);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
