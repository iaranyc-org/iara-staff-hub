/* ==========================================================================
   iara staff kit: tooltips for STATIC apps. Vanilla JS, no deps.
   Needs tokens.css + staff.css (.k-tip styles).

   Use:  <span data-k-tip="Short supplementary text.">...</span>
         <span data-k-tip-for="helpId">...</span>  (richer text lives in #helpId;
                                                  links/buttons in it are stripped)
         <script src="/kit/tip.js" defer></script>
   Text may hold "\n" line breaks. Elements added later (charts, re-renders)
   are picked up automatically.

   Behaviour (WCAG 1.4.13, WAI-ARIA APG tooltip):
   - hover opens after 300ms; keyboard focus opens at once; a touch tap toggles
     and a tap anywhere else closes
   - hoverable (the pointer can move onto it), Escape closes without moving
     focus, stays until blur / pointer leave / Escape
   - one tooltip at a time, role="tooltip", linked by aria-describedby
   - triggers that can't take focus (chart bars, table rows) get tabindex=0;
     ones with no accessible name get role="img" + aria-label = the tip text
   - never put essential info only in a tooltip (UX-WRITING §9)
   - placement: CSS anchor positioning where supported, else Floating UI
     (/kit/vendor/floating-ui.min.js, fetched on first use), else a built-in clamp
   ========================================================================== */
(function () {
  if (window.iaraTip) return;

  var SEL = "[data-k-tip], [data-k-tip-for]";
  var HOVER_DELAY = 300, LEAVE_DELAY = 120, GAP = 8, EDGE = 8;
  var tip, cur = null, openTimer = 0, closeTimer = 0, touchAt = 0, store, n = 0;

  function el() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "k-tip"; tip.id = "k-tip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
    tip.addEventListener("pointerenter", function () { clearTimeout(closeTimer); });
    tip.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") scheduleClose(); });
    document.body.appendChild(tip);
    return tip;
  }

  function textOf(t) { return t.getAttribute("data-k-tip") || ""; }
  function interactive(t) { return t.matches("a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]"); }
  function hasName(t) {
    if (t.getAttribute("aria-label") || t.getAttribute("aria-labelledby")) return true;
    if (/^(IMG|svg)$/.test(t.tagName) && t.getAttribute("alt")) return true;
    return !!(t.textContent || "").trim();
  }

  // Make a trigger reachable by keyboard and named for screen readers.
  function upgrade(t) {
    var text = textOf(t), forId = t.getAttribute("data-k-tip-for");
    if (!interactive(t)) t.setAttribute("tabindex", "0");
    if (!hasName(t) || t.hasAttribute("data-k-tip-named")) {
      // No name of its own (e.g. a chart bar): the tip text IS the name.
      if (!t.getAttribute("role")) t.setAttribute("role", "img");
      var name = forId ? (document.getElementById(forId) || {}).textContent || "" : text;
      t.setAttribute("aria-label", name.replace(/\s+/g, " ").trim());
      t.setAttribute("data-k-tip-named", "");
      t.removeAttribute("aria-describedby");
      return;
    }
    if (forId) { t.setAttribute("aria-describedby", forId); return; }
    // Static description, so it is announced on focus even before the tip paints.
    var id = t.getAttribute("data-k-tip-desc");
    if (!store) { store = document.createElement("div"); store.hidden = true; store.id = "k-tip-store"; document.body.appendChild(store); }
    var d = id && document.getElementById(id);
    if (!d) { d = document.createElement("span"); d.id = id = "k-tip-d" + (++n); store.appendChild(d); t.setAttribute("data-k-tip-desc", id); }
    d.textContent = text;
    t.setAttribute("aria-describedby", id);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches(SEL)) upgrade(root);
    Array.prototype.forEach.call(root.querySelectorAll(SEL), upgrade);
  }

  function fill(t) {
    var box = el(), forId = t.getAttribute("data-k-tip-for");
    if (forId) {
      var src = document.getElementById(forId);
      box.innerHTML = src ? src.innerHTML : "";
      // Tooltips never hold interactive content (UX-WRITING §9).
      Array.prototype.forEach.call(box.querySelectorAll("a, button, input, select, textarea, [tabindex]"), function (x) {
        var s = document.createElement("span"); s.textContent = x.textContent; x.replaceWith(s);
      });
      Array.prototype.forEach.call(box.querySelectorAll("[id]"), function (x) { x.removeAttribute("id"); });
    } else box.textContent = textOf(t);
  }

  // Positioning, best first: CSS anchor positioning (no JS math, follows scroll), then Floating UI
  // (vendor/floating-ui.min.js, loaded on demand from this folder), then the built-in clamp below.
  // window.IARA_TIP_POS = "anchor" | "floating" | "manual" forces one (QA).
  var here = (document.currentScript && document.currentScript.src) || "/kit/tip.js", fui = null;
  function mode() {
    if (window.IARA_TIP_POS) return window.IARA_TIP_POS;
    return window.CSS && CSS.supports && CSS.supports("position-area: top") && CSS.supports("position-try-fallbacks: flip-block") ? "anchor" : "floating";
  }
  function loadFloating() {
    if (window.FloatingUIDOM || fui) return;
    fui = document.createElement("script"); fui.src = here.replace(/tip\.js(\?.*)?$/, "vendor/floating-ui.min.js");
    fui.onload = function () { if (cur) place(cur); }; document.head.appendChild(fui);
  }
  var anchored = null;
  function place(t) {
    var box = el(), m = mode();
    if (anchored && anchored !== t) anchored.style.removeProperty("anchor-name");
    if (m === "anchor") {
      t.style.setProperty("anchor-name", "--k-tip"); anchored = t;
      box.style.left = box.style.top = ""; box.setAttribute("data-anchored", "");
      var rr = box.getBoundingClientRect(), tr = t.getBoundingClientRect();
      box.setAttribute("data-side", rr.top >= tr.bottom - 1 ? "bottom" : "top");
      return;
    }
    box.removeAttribute("data-anchored");
    if (m === "floating") {
      loadFloating();
      var F = window.FloatingUIDOM;
      if (F) {
        F.computePosition(t, box, { placement: "top", strategy: "fixed", middleware: [F.offset(GAP), F.flip({ padding: EDGE }), F.shift({ padding: EDGE })] })
          .then(function (p) { box.style.left = Math.round(p.x) + "px"; box.style.top = Math.round(p.y) + "px"; box.setAttribute("data-side", p.placement.indexOf("bottom") === 0 ? "bottom" : "top"); });
        return;
      }
    }
    var r = t.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    box.style.left = "0px"; box.style.top = "0px";
    var w = box.offsetWidth, h = box.offsetHeight;
    var top = r.top - h - GAP, below = top < EDGE;
    if (below) top = Math.min(r.bottom + GAP, vh - h - EDGE);
    var left = Math.max(EDGE, Math.min(r.left + r.width / 2 - w / 2, vw - w - EDGE));
    box.style.left = Math.round(left) + "px"; box.style.top = Math.round(Math.max(EDGE, top)) + "px";
    box.setAttribute("data-side", below ? "bottom" : "top");
  }

  function open(t) {
    clearTimeout(openTimer); clearTimeout(closeTimer);
    if (!textOf(t) && !t.getAttribute("data-k-tip-for")) return;
    if (cur && cur !== t) close();
    cur = t; fill(t);
    var box = el(); box.hidden = false; place(t);
    // While visible, the trigger points at the live tooltip too.
    if (!t.hasAttribute("data-k-tip-named")) {
      var d = t.getAttribute("aria-describedby") || "";
      if (d.split(" ").indexOf("k-tip") < 0) { t.setAttribute("data-k-tip-prev", d); t.setAttribute("aria-describedby", "k-tip"); }
    }
  }
  function close() {
    clearTimeout(openTimer); clearTimeout(closeTimer);
    if (anchored) { anchored.style.removeProperty("anchor-name"); anchored = null; }
    if (tip) tip.hidden = true;
    if (cur && cur.hasAttribute("data-k-tip-prev")) {
      var p = cur.getAttribute("data-k-tip-prev"); cur.removeAttribute("data-k-tip-prev");
      if (p) cur.setAttribute("aria-describedby", p); else cur.removeAttribute("aria-describedby");
    }
    cur = null;
  }
  function scheduleClose() { clearTimeout(closeTimer); closeTimer = setTimeout(close, LEAVE_DELAY); }
  function trigger(e) { return e.target && e.target.closest ? e.target.closest(SEL) : null; }

  // Hover (mouse/pen only; touch is a tap)
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType === "touch") return;
    var t = trigger(e);
    if (!t) return;
    clearTimeout(closeTimer);
    if (t === cur) return;
    clearTimeout(openTimer);
    openTimer = setTimeout(function () { open(t); }, cur ? 0 : HOVER_DELAY);
  });
  document.addEventListener("pointerout", function (e) {
    if (e.pointerType === "touch") return;
    var t = trigger(e);
    if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
    clearTimeout(openTimer);
    if (t === cur && !(tip && e.relatedTarget && tip.contains(e.relatedTarget)) && document.activeElement !== t) scheduleClose();
  });

  // Tap toggles; a tap anywhere else closes.
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch") return;
    touchAt = Date.now();
    var t = trigger(e);
    if (t) { if (cur === t) close(); else open(t); return; }
    if (cur && !(tip && tip.contains(e.target))) close();
  }, true);
  // Mouse click outside also closes a focus-opened tip.
  document.addEventListener("mousedown", function (e) {
    if (cur && !trigger(e) && !(tip && tip.contains(e.target))) close();
  }, true);

  // Keyboard focus opens at once (but not the focus a tap causes).
  document.addEventListener("focusin", function (e) {
    var t = trigger(e);
    if (!t || t !== e.target || Date.now() - touchAt < 800) return;
    open(t);
  });
  document.addEventListener("focusout", function (e) {
    var t = trigger(e);
    if (t && t === cur && Date.now() - touchAt > 800) close();
  });

  // Escape closes without moving focus. Capture phase so it beats app modals' Escape handlers.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cur) { e.stopPropagation(); e.preventDefault(); close(); }
  }, true);

  window.addEventListener("resize", function () { if (cur) place(cur); });
  window.addEventListener("scroll", function () { if (cur) { if (cur.isConnected) place(cur); else close(); } }, true);

  function mount() {
    scan(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === "attributes") { if (m.target.matches(SEL)) { upgrade(m.target); if (m.target === cur) fill(cur); } }
        else Array.prototype.forEach.call(m.addedNodes, scan);
      });
      if (cur && !cur.isConnected) close();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-k-tip", "data-k-tip-for"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  window.iaraTip = { open: open, close: close, refresh: function () { scan(document.body); } };
})();
