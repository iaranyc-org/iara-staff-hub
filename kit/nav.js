/* ==========================================================================
   iara staff kit: app bar for STATIC apps. Vanilla JS, no deps.
   The one cross-app navigation. Next apps render the same markup from
   next/staff-bar.tsx; both use the .k-appbar styles in staff.css.

   Use:  <div data-k-appbar data-app="Kitchen Ops" data-home="/ops"></div>
         <script src="/kit/palette.js" defer></script>
         <script src="/kit/nav.js" defer></script>
   Account: window.iaraNav.setAccount({ email: "x@iara.nyc", signOut: fn })
            setAccount(null) hides the account menu (e.g. password-gated apps).
   Hide the bar while a sign-in gate shows: the app toggles [hidden] on the
   placeholder, exactly as it already does for its gate/app views.
   ========================================================================== */
(function () {
  if (window.iaraNav) return;

  // Top-level apps for the switcher. Sub-pages live in the palette (palette.js / next/apps.ts).
  var APPS = [
    { label: "Staff Home", href: "/", icon: "home" },
    { label: "Lineup", href: "/lineup", icon: "list" },
    { label: "Kitchen Ops", href: "/ops", icon: "chef" },
    { label: "Analytics", href: "/analytics", icon: "chart" },
    { label: "Inbox", href: "/inbox", icon: "inbox" },
    { label: "Private Dining", href: "/private-dining", icon: "wine" }
  ];
  var P = 'aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    grid: '<svg ' + P + '><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    home: '<svg ' + P + '><path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/></svg>',
    list: '<svg ' + P + '><path d="M13 5h8M13 12h8M13 19h8"/><path d="m3 5 2 2 4-4M3 12l2 2 4-4M3 19l2 2 4-4"/></svg>',
    chef: '<svg ' + P + '><path d="M6 13.9A4 4 0 1 1 8.3 6a5 5 0 0 1 7.4 0A4 4 0 1 1 18 13.9V21H6z"/><path d="M6 17h12"/></svg>',
    chart: '<svg ' + P + '><path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/></svg>',
    inbox: '<svg ' + P + '><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v7H2v-7z"/></svg>',
    wine: '<svg ' + P + '><path d="M8 22h8M12 15v7M7 3h10l-1 7a4 4 0 0 1-8 0z"/></svg>',
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

  function menu(id, btnHtml, label, itemsHtml) {
    return '<div class="k-menu"><button type="button" class="k-appbar-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="' + id + '" aria-label="' + label + '">' + btnHtml + '</button>' +
      '<div class="k-menu-list" role="menu" id="' + id + '" hidden>' + itemsHtml + '</div></div>';
  }

  function render(el) {
    var name = el.getAttribute("data-app") || currentApp().label;
    var home = el.getAttribute("data-home") || currentApp().href;
    var cur = currentApp();
    var apps = APPS.map(function (a) {
      return '<a class="k-menu-item" role="menuitem" href="' + a.href + '"' + (a === cur ? ' aria-current="page"' : "") + ">" + ICON[a.icon] + "<span>" + a.label + "</span></a>";
    }).join("");
    var acct = account ? menu("k-acct-menu", '<span class="k-avatar">' + esc((account.email || "?").charAt(0)) + "</span>", "Account",
      '<div class="k-menu-label">' + esc(account.email || "Signed in") + '</div><div class="k-menu-sep" role="separator"></div>' +
      (account.signOut ? '<button type="button" class="k-menu-item" role="menuitem" data-k-signout>' + ICON.out + "<span>Sign Out</span></button>" : "")) : "";
    el.innerHTML = '<header class="k-appbar">' +
      '<a class="k-lockup" href="' + home + '" aria-label="iara ' + esc(name) + ' home"><img src="/kit/iara-orange.svg" alt="iara"><span>' + esc(name) + "</span></a>" +
      '<div class="k-appbar-spacer"></div><div class="k-appbar-actions"><span data-k-palette-slot></span>' +
      menu("k-apps-menu", ICON.grid + '<span class="k-appbar-label">Apps</span>', "Apps", apps) + acct + "</div></header>";
    var slot = el.querySelector("[data-k-palette-slot]");
    if (slot && window.iaraPalette) slot.appendChild(window.iaraPalette.trigger());
    var so = el.querySelector("[data-k-signout]");
    if (so) so.addEventListener("click", function () { closeAll(); account.signOut(); });
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
    setAccount: function (a) { account = a && (a.email || a.signOut) ? a : null; bars.forEach(render); },
    refresh: mount
  };
})();
