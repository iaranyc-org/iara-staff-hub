/* ==========================================================================
   iara staff kit: app bar for STATIC apps. Vanilla JS, no deps.
   The one cross-app navigation. Next apps render the same markup from
   next/staff-bar.tsx; both use the .k-appbar styles in staff.css.

   Use:  <div data-k-appbar></div>   (title + current tab come from the URL)
         Lineup only: <div data-k-appbar data-mode="solo"></div>  (no manager tabs, no search)
         <script src="/kit/palette.js" defer></script>
         <script src="/kit/nav.js" defer></script>
   Account: window.iaraNav.setAccount({ email: "x@iara.nyc", signOut: fn })
            setAccount(null) hides the account menu (e.g. password-gated apps).
   Hide the bar while a sign-in gate shows: the app toggles [hidden] on the
   placeholder, exactly as it already does for its gate/app views.
   ========================================================================== */
(function () {
  if (window.iaraNav) return;

  // Manager app tabs, in order (keep identical to TABS in next/staff-bar.tsx). `title` is the
  // rolling name shown by the logo. Lineup is a separate staff app: it opens in a new tab.
  var APPS = [
    { label: "Home", title: "Staff Home", href: "/" },
    { label: "Kitchen Ops", title: "Kitchen Ops", href: "/ops" },
    { label: "Analytics", title: "Analytics", href: "/analytics" },
    { label: "Inbox", title: "Inbox", href: "/inbox" },
    { label: "Private Dining", title: "Private Dining", href: "/private-dining" },
    { label: "Lineup", title: "Lineup", href: "/lineup", external: true }
  ];
  var P = 'aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    ext: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    out: '<svg ' + P + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>'
  };
  var FILES = { "/iara_hub.html": "/", "/iara_staff_hub.html": "/lineup", "/iara_kitchen_ops.html": "/ops", "/iara_analytics.html": "/analytics" };
  function here() { var p = location.pathname; return FILES[p] || p; }
  function currentApp() {
    var p = here(), best = APPS[0];
    APPS.forEach(function (a) { if (a.href !== "/" && (p === a.href || p.indexOf(a.href + "/") === 0)) best = a; });
    return best;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var account = null, bars = [];

  function menu(id, cls, btnHtml, label, itemsHtml) {
    return '<div class="k-menu"><button type="button" class="' + cls + '" aria-haspopup="menu" aria-expanded="false" aria-controls="' + id + '" aria-label="' + label + '">' + btnHtml + '</button>' +
      '<div class="k-menu-list" role="menu" id="' + id + '" hidden>' + itemsHtml + '</div></div>';
  }

  function render(el) {
    var cur = currentApp();
    var name = el.getAttribute("data-app") || cur.title;
    var solo = el.getAttribute("data-mode") === "solo";   // Lineup: its own instance, no manager tabs or search
    if (solo) document.documentElement.setAttribute("data-k-nav", "solo");
    var tabs = solo ? "" : '<nav class="k-apptabs" aria-label="Manager apps">' + APPS.map(function (a) {
      return '<a class="k-apptab" href="' + a.href + '"' + (a === cur ? ' aria-current="page"' : "") +
        (a.external ? ' target="_blank" rel="noopener" aria-label="' + a.label + ', opens in a new tab"' : "") + ">" + a.label + (a.external ? ICON.ext : "") + "</a>";
    }).join("") + "</nav>";
    el.innerHTML = '<header class="k-appbar"' + (solo ? ' data-mode="solo"' : "") + '><div class="k-appbar-inner">' +
      '<a class="k-appbar-mark" href="/" aria-label="iara Staff Home"><img src="/kit/iara-orange.svg" alt="iara"></a>' +
      '<span class="k-appbar-title"><span class="k-roll"><span class="k-roll-in">' + esc(name) + "</span></span></span>" +
      tabs + '<div class="k-appbar-spacer"></div>' + (solo ? "" : "<span data-k-palette-slot></span>") +
      '<span data-k-acct style="display:contents"></span></div></header>';
    var slot = el.querySelector("[data-k-palette-slot]");
    if (slot && window.iaraPalette) slot.appendChild(window.iaraPalette.trigger());
    paintAccount(el);
    roll(el.querySelector(".k-roll"), name);
  }

  // Account menu repaints on its own, so a late sign-in never interrupts the name roll.
  function paintAccount(el) {
    var box = el.querySelector("[data-k-acct]"); if (!box) return;
    box.innerHTML = account ? menu("k-acct-menu", "k-appbar-btn", '<span class="k-avatar">' + esc((account.email || "?").charAt(0)) + "</span>", account.email ? "Account, " + esc(account.email) : "Account",
      '<div class="k-menu-label">' + esc(account.email || "Signed in") + '</div><div class="k-menu-sep" role="separator"></div>' +
      (account.signOut ? '<button type="button" class="k-menu-item" role="menuitem" data-k-signout>' + ICON.out + "<span>Sign Out</span></button>" : "")) : "";
    var so = box.querySelector("[data-k-signout]");
    if (so) so.addEventListener("click", function () { closeAll(); account.signOut(); });
  }

  // Vertical roll when arriving from a different staff app (same origin, so sessionStorage is shared).
  // Transform-only: the resting state is the new name in place, so a frozen frame is still readable.
  var rolled = false;
  function roll(box, name) {
    var prev = null;
    try { prev = sessionStorage.getItem("iara-last-app"); sessionStorage.setItem("iara-last-app", name); } catch (e) {}
    if (rolled || !box || !prev || prev === name) return;
    rolled = true;
    if (document.visibilityState !== "visible" || !box.animate) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var out = document.createElement("span"); out.className = "k-roll-out"; out.setAttribute("aria-hidden", "true"); out.textContent = prev;
    box.appendChild(out);
    var opts = { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
    box.querySelector(".k-roll-in").animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], opts);
    out.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], opts).onfinish = function () { out.remove(); };
  }

  function closeAll(except) {
    document.querySelectorAll(".k-appbar .k-menu-list").forEach(function (m) {
      if (m === except) return;
      m.hidden = true;
      var b = m.parentNode.querySelector("[aria-haspopup=menu]"); if (b) b.setAttribute("aria-expanded", "false");
    });
  }
  function items(m) { return Array.prototype.slice.call(m.querySelectorAll('[role="menuitem"]')); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".k-appbar [aria-haspopup=menu]");
    if (b) {
      var m = document.getElementById(b.getAttribute("aria-controls")), opening = m.hidden;
      closeAll(m); m.hidden = !opening; b.setAttribute("aria-expanded", String(opening));
      if (opening) { var it = items(m); (it.filter(function (x) { return x.getAttribute("aria-current"); })[0] || it[0] || b).focus(); }
      return;
    }
    if (!(e.target.closest && e.target.closest(".k-menu-list"))) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    var m = document.activeElement && document.activeElement.closest && document.activeElement.closest(".k-appbar .k-menu-list");
    if (!m) return;
    var it = items(m), i = it.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeAll(); m.parentNode.querySelector("[aria-haspopup=menu]").focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); it[(i + 1) % it.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); it[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); it[it.length - 1].focus(); }
    else if (e.key === "Tab") closeAll();
  });

  function mount() {
    bars = Array.prototype.slice.call(document.querySelectorAll("[data-k-appbar]"));
    bars.forEach(render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  window.iaraNav = {
    apps: APPS,
    setAccount: function (a) { account = a && (a.email || a.signOut) ? a : null; bars.forEach(paintAccount); },
    refresh: mount
  };
})();
