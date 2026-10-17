/* iara staff kit: kitchen loading (static twin of next/loading.tsx). Same 13 lines and icons.
   Quiet (in-page): any .k-skel / .k-skel-cols with aria-busy="true", or [data-k-cook], gets one small
   aria-hidden line appended, swapping every 1.6s.
   Bold (full-page first load): an empty [data-k-bigload] element inside a role="status" container is
   filled with a 76px badge + matching icon, the line in the display serif, and an indeterminate bar.
   Both: nothing before 200ms, rotating text aria-hidden (the container's .k-sr-only label is the stable
   announcement), transform-only pop, swapping pauses while hidden and stops once removed.
   Reduced motion: one static icon+line, static bar. Load without defer if a boot screen needs it. */
(function () {
  if (window.kLoading) return;
  // Icons are lucide (stroke 1.75), each picked to read clearly at 40px. Contact sheet: kit qa/fun-loading/icon-sheet-final.png
  var K = [
    ["Lighting the Grill", "<path d=\"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4\"></path>"],
    ["Squeezing the Limes", "<path d=\"M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z\"></path><path d=\"M19.65 15.66A8 8 0 0 1 8.35 4.34\"></path><path d=\"m14 10-5.5 5.5\"></path><path d=\"M14 17.85V10H6.15\"></path>"],
    ["Muddling the Caipirinhas", "<path d=\"M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z\"></path><path d=\"M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0\"></path>"],
    ["Polishing the Glasses", "<path d=\"M8 22h8\"></path><path d=\"M7 10h10\"></path><path d=\"M12 15v7\"></path><path d=\"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z\"></path>"],
    ["Calling Back of House", "<path d=\"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z\"></path><path d=\"M6 17h12\"></path>"],
    ["Bom Dia, Chef", "<circle cx=\"12\" cy=\"12\" r=\"4\"></circle><path d=\"M12 2v2\"></path><path d=\"M12 20v2\"></path><path d=\"m4.93 4.93 1.41 1.41\"></path><path d=\"m17.66 17.66 1.41 1.41\"></path><path d=\"M2 12h2\"></path><path d=\"M20 12h2\"></path><path d=\"m6.34 17.66-1.41 1.41\"></path><path d=\"m19.07 4.93-1.41 1.41\"></path>"],
    ["Brewing the Cafezinho", "<path d=\"M10 2v2\"></path><path d=\"M14 2v2\"></path><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\"></path><path d=\"M6 2v2\"></path>"],
    ["Ringing the Pass", "<path d=\"M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z\"></path><path d=\"M20 16a8 8 0 1 0-16 0\"></path><path d=\"M12 4v4\"></path><path d=\"M10 4h4\"></path>"],
    ["Cueing the Bossa Nova", "<path d=\"M9 18V5l12-2v13\"></path><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><circle cx=\"18\" cy=\"16\" r=\"3\"></circle>"],
    ["Stirring the Pot", "<path d=\"M2 12h20\"></path><path d=\"M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8\"></path><path d=\"m4 8 16-4\"></path><path d=\"m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8\"></path>"],
    ["Setting the Tables", "<path d=\"m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8\"></path><path d=\"M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7\"></path><path d=\"m2.1 21.8 6.4-6.3\"></path><path d=\"m19 5-7 7\"></path>"],
    ["Prepping the Fish", "<path d=\"M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z\"></path><path d=\"M18 12v.5\"></path><path d=\"M16 17.93a9.77 9.77 0 0 1 0-11.86\"></path><path d=\"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33\"></path><path d=\"M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4\"></path><path d=\"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98\"></path>"],
    ["Picking the Herbs", "<path d=\"M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3\"></path><path d=\"M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4\"></path><path d=\"M5 21h14\"></path>"]
  ];
  function svg(i, size, cls) { return '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + K[i][1] + '</svg>'; }
  var HAT = 4; // Calling Back of House = ChefHat, the quiet line's icon
  var SEL = '[data-k-cook], .k-skel[aria-busy="true"], .k-skel-cols[aria-busy="true"]';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pick(not) { var i = Math.floor(Math.random() * K.length); return i === not ? (i + 1) % K.length : i; }
  function rotate(el, show) {
    var cur = pick(); show(cur);
    if (reduce) return;
    var iv = setInterval(function () {
      if (!el.isConnected) { clearInterval(iv); return; }  // removed: stop
      if (!el.getClientRects().length) return;            // hidden (gate, done): skip, resume if shown again
      cur = pick(cur); show(cur);
    }, 1600);
  }
  function attach(el) {
    if (el.__kCook) return; el.__kCook = 1;
    var p = document.createElement('p'); p.className = 'k-cook'; p.setAttribute('aria-hidden', 'true');
    el.appendChild(p); // empty but height-reserved, so nothing shifts at 200ms
    setTimeout(function () {
      if (!p.isConnected) return;
      p.innerHTML = svg(HAT, 16, 'k-cook-icon') + '<span></span>'; var s = p.lastChild;
      rotate(p, function (i) { s.textContent = K[i][0]; });
    }, 200);
  }
  function big(el) {
    if (el.__kCook) return; el.__kCook = 1;
    el.classList.add('k-bigload');
    el.innerHTML = '<div class="k-bigload-badge" aria-hidden="true"></div><p class="k-bigload-line" aria-hidden="true"></p><span class="k-bigload-bar" aria-hidden="true"></span>';
    var b = el.firstChild, l = b.nextSibling;
    setTimeout(function () {
      if (!el.isConnected) return;
      rotate(el, function (i) { b.innerHTML = svg(i, 40, 'k-bigload-pop'); l.innerHTML = '<span class="k-bigload-pop"></span>'; l.firstChild.textContent = K[i][0]; });
    }, 200);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches(SEL)) attach(root);
    if (root.matches('[data-k-bigload]')) big(root);
    var all = root.querySelectorAll(SEL), i; for (i = 0; i < all.length; i++) attach(all[i]);
    all = root.querySelectorAll('[data-k-bigload]'); for (i = 0; i < all.length; i++) big(all[i]);
  }
  window.kLoading = attach;
  scan(document.documentElement);
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) scan(ms[i].addedNodes[j]);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
