/* ==========================================================================
   iara staff kit: command palette (static apps). Vanilla JS, no deps.
   Needs tokens.css + staff.css (.k-palette* styles).

   Open: Cmd+K / Ctrl+K, or "/" when focus is not in a field, or click any
   .k-palette-trigger (the only way in on touch). Esc closes, focus returns.

   Apps add actions:  window.iaraPalette.register([{label, keywords, run}])
   Trigger markup:    window.iaraPalette.trigger() returns a ready button,
                      or write <button class="k-palette-trigger" data-k-palette>.

   Gates: the palette refuses to open while a sign-in gate is on screen
   (#gate, #authGate, .k-gate or [data-k-gate] that is not hidden), so apps
   need no wiring for it.
   ========================================================================== */
(function () {
  if (window.iaraPalette) return;

  // Canonical list of staff apps. Keep in sync with iara-staff-hub/vercel.json.
  var APPS = [
    { label: "Staff Home", href: "/", keywords: "hub launcher start" },
    { label: "Lineup", href: "/lineup", keywords: "manual menu study quiz training" },
    { label: "Kitchen Ops", href: "/ops", keywords: "costing inventory recipes purchasing" },
    { label: "Analytics", href: "/analytics", keywords: "stats reply rate dashboard" },
    { label: "Phone", href: "/analytics#t=phone", keywords: "calls texts quo answer rate" },
    { label: "Inbox", href: "/inbox", keywords: "guest messages email dm replies" },
    { label: "Reviews", href: "/inbox/reviews", keywords: "google yelp stars" },
    { label: "Contacts", href: "/inbox/contacts", keywords: "guests people crm" },
    { label: "Inbox Settings", href: "/inbox/settings", keywords: "preferences config" },
    { label: "Private Dining", href: "/private-dining", keywords: "pdr events parties" }
  ];
  window.IARA_APPS = APPS;

  var actions = [];
  var root, input, list, lastFocus, items = [], active = 0, uid = 0;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  // Raw hub filenames (local preview) map to their rewritten paths.
  var FILES = { "/iara_hub.html": "/", "/iara_staff_hub.html": "/lineup", "/iara_kitchen_ops.html": "/ops", "/iara_analytics.html": "/analytics" };
  function path() { var p = location.pathname; return FILES[p] || p.replace(/\/+$/, "") || "/"; }
  // Current = the longest app href that the page path matches (so /inbox/reviews is Reviews, not Inbox).
  function currentHref() {
    var p = path(), best = null, phone = /(^|[#&])t=phone/.test(location.hash.slice(1));
    APPS.forEach(function (a) {
      var h = a.href.split("#")[0];
      if (a.href.indexOf("#") > -1 && !phone) return;
      if (p === h || (h !== "/" && p.indexOf(h + "/") === 0) || (h === "/" && p === "/")) {
        if (!best || a.href.length > best.length) best = a.href;
      }
    });
    return best;
  }
  function here(href) { return href === currentHref(); }
  // Fuzzy-ish: every query word must appear in label+keywords; label-prefix hits rank first.
  function score(label, kw, q) {
    if (!q) return 1;
    var hay = norm(label + " " + kw), L = norm(label), words = q.split(/\s+/).filter(Boolean);
    for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return 0;
    return L.indexOf(q) === 0 ? 3 : L.indexOf(q) > -1 ? 2 : 1;
  }
  function gated() {
    var g = document.querySelectorAll("#gate, #authGate, .k-gate, [data-k-gate]");
    for (var i = 0; i < g.length; i++) if (!g[i].hidden && g[i].getClientRects().length) return true;
    return false;
  }

  function build() {
    root = document.createElement("div");
    root.className = "k-palette";
    root.hidden = true;
    root.innerHTML =
      '<div class="k-palette-scrim" data-close></div>' +
      '<div class="k-palette-dialog" role="dialog" aria-modal="true" aria-label="Search Staff Apps">' +
      '<div class="k-palette-head">' +
      '<input class="k-palette-input" type="text" role="combobox" aria-expanded="true" aria-controls="k-palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Search Apps and Actions" aria-label="Search Apps and Actions">' +
      '<button type="button" class="k-palette-esc" data-close aria-label="Close">Esc</button></div>' +
      '<ul class="k-palette-list" id="k-palette-list" role="listbox" aria-label="Results"></ul></div>';
    document.body.appendChild(root);
    input = root.querySelector("input");
    list = root.querySelector("ul");
    input.addEventListener("input", function () { active = 0; paint(); });
    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) return close();
      var li = e.target.closest("[role=option]");
      if (li) choose(+li.dataset.i);
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest("[role=option]");
      if (li && +li.dataset.i !== active) { active = +li.dataset.i; mark(); }
    });
    root.addEventListener("keydown", onKey);
  }

  function paint() {
    var q = norm(input.value).trim();
    var go = APPS.map(function (a) { return { label: a.label, hint: here(a.href) ? "Current" : "", s: score(a.label, a.keywords, q), href: a.href, group: "Go To", cur: here(a.href) }; });
    var acts = actions.map(function (a) { return { label: a.label, hint: "", s: score(a.label, a.keywords, q), run: a.run, group: "Actions" }; });
    function rank(arr) { return arr.filter(function (x) { return x.s; }).sort(function (a, b) { return q ? b.s - a.s : 0; }); }
    // With a query, the better-matching group leads; without one, actions first (they are this page's).
    var g1 = rank(acts), g2 = rank(go);
    var groups = [["Actions", g1], ["Go To", g2]];
    if (q && g2.length && (!g1.length || g2[0].s > g1[0].s)) groups.reverse();
    items = [];
    var html = "";
    groups.forEach(function (g) {
      if (!g[1].length) return;
      html += '<li role="presentation" class="k-palette-group">' + g[0] + "</li>";
      g[1].forEach(function (x) {
        var i = items.push(x) - 1;
        html += '<li role="option" id="k-pal-' + uid + "-" + i + '" data-i="' + i + '" aria-selected="false"' + (x.cur ? ' aria-current="page"' : "") + '>' +
          '<span class="k-palette-label">' + esc(x.label) + "</span>" + (x.hint ? '<span class="k-palette-hint">' + x.hint + "</span>" : "") + "</li>";
      });
    });
    if (!items.length) html = '<li role="presentation" class="k-palette-empty">No Matches</li>';
    list.innerHTML = html;
    if (active >= items.length) active = 0;
    mark();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mark() {
    var opts = list.querySelectorAll("[role=option]");
    opts.forEach(function (o) { o.setAttribute("aria-selected", String(+o.dataset.i === active)); });
    var cur = opts[active];
    if (cur) { input.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  }
  function choose(i) {
    var x = items[i]; if (!x) return;
    close(!!x.href);
    if (x.run) { try { x.run(); } catch (e) { console.error(e); } }
    else if (x.href.indexOf("#") > -1 && x.href.split("#")[0] === path()) location.hash = x.href.split("#")[1]; // same app: let its hash router switch
    else location.href = x.href;
  }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); return close(); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; mark();
    } else if (e.key === "Home" && e.ctrlKey) { active = 0; mark(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(active); }
    else if (e.key === "Tab") {
      // Trap: input <-> close button only.
      var f = root.querySelectorAll("input, button"), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function open() {
    if (gated()) return false;
    if (!root) build();
    if (!root.hidden) { input.focus(); return true; }
    lastFocus = document.activeElement;
    uid++; input.value = ""; active = 0; paint();
    root.hidden = false;
    document.documentElement.classList.add("k-palette-open");
    input.focus();
    triggers().forEach(function (t) { t.setAttribute("aria-expanded", "true"); });
    return true;
  }
  function close(leaving) {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove("k-palette-open");
    triggers().forEach(function (t) { t.setAttribute("aria-expanded", "false"); });
    if (!leaving && lastFocus && lastFocus.focus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { lastFocus.focus(); } }
  }
  function triggers() { return Array.prototype.slice.call(document.querySelectorAll("[data-k-palette]")); }

  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if (k === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      if (root && !root.hidden) { e.preventDefault(); return close(); }
      if (open()) e.preventDefault();
      return;
    }
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && (!root || root.hidden)) {
      var t = e.target, tag = t && t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (open()) e.preventDefault();
    }
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-k-palette]");
    if (t) { e.preventDefault(); open(); }
  });

  function trigger() {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "k-palette-trigger";
    b.setAttribute("data-k-palette", "");
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-keyshortcuts", isMac ? "Meta+K" : "Control+K");
    b.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      "<span>Search</span><kbd>" + (isMac ? "⌘K" : "Ctrl K") + "</kbd>";
    return b;
  }
  // Fill any placeholder <span data-k-palette-slot></span> the app left in its header.
  function fillSlots() {
    document.querySelectorAll("[data-k-palette-slot]").forEach(function (s) { if (!s.firstChild) s.appendChild(trigger()); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillSlots); else fillSlots();

  window.iaraPalette = {
    open: open,
    close: function () { close(); },
    trigger: trigger,
    register: function (arr) {
      (arr || []).forEach(function (a) { if (a && a.label && typeof a.run === "function") actions.push({ label: a.label, keywords: a.keywords || "", run: a.run }); });
      if (root && !root.hidden) paint();
    },
    apps: APPS
  };
})();
