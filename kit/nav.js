/* ==========================================================================
   iara staff kit: app bar for STATIC apps. Vanilla JS, no deps.
   The one cross-app navigation. Next apps render the same markup from
   next/staff-bar.tsx; both use the .k-appbar styles in staff.css.

   Use:  <div data-k-appbar></div>   (title + current tab come from the URL)
         Lineup only: <div data-k-appbar data-mode="solo"></div>  (no manager tabs, no search)
         <script src="/kit/palette.js" defer></script>
         <script src="/kit/nav.js" defer blocking="render"></script>   (render-blocking: the bar must be in the first frame for the title roll)
   Account: window.iaraNav.setAccount({ email: "x@iara.nyc", signOut: fn })
            setAccount(null) hides the account menu (e.g. password-gated apps).
   Hide the bar while a sign-in gate shows: the app toggles [hidden] on the
   placeholder, exactly as it already does for its gate/app views.
   ========================================================================== */
(function () {
  if (window.iaraNav) return;

  // Manager app tabs, in order (keep identical to TABS in next/staff-bar.tsx). `title` is the
  // rolling name shown by the logo. Lineup is a separate staff app: it opens in a new tab.
  // "/" is the public staff landing (password gate + Lineup/Manager Login); it has no bar.
  // Inbox family (Jay, 2026-10-14: "analytics for the inbox needs to be a drop-down from inbox"):
  // the Inbox tab opens a menu of its pages; Analytics is part of Inbox (no tab of its own),
  // shares the "Inbox" rolling title (no roll between them) and keeps its own subtitle.
  var INBOX_MENU = [
    { label: "Messages", href: "/inbox" },
    { label: "Reviews", href: "/inbox/reviews" },
    { label: "Contacts", href: "/inbox/contacts" },
    { label: "Analytics", href: "/analytics" },
    { label: "Settings", href: "/inbox/settings" }
  ];
  // `more: true` tabs fold into a "More" menu on phones under 480px (staff.css hides them, shows the More button).
  var APPS = [
    { label: "Home", title: "Home", href: "/home", sub: "Today at iara, from this morning's Bom Dia." },
    // Hidden (Jay, 2026-10-14: still being built). /ops keeps working and its bar still renders,
    // but nothing links to it: no tab, no palette entry, no shortcut.
    { label: "Kitchen Ops", title: "Kitchen Ops", href: "/ops", sub: "Track ingredient costs, recipes, inventory and orders.", hidden: true },
    { label: "Inbox", title: "Inbox", href: "/inbox", sub: "Review drafted replies to guest texts, emails and DMs before they send.", menu: INBOX_MENU },
    { label: "Analytics", title: "Inbox", href: "/analytics", sub: "See how fast we answer guests and how bookings are going.", hidden: true, parent: "/inbox" },
    { label: "Private Dining", title: "Private Dining", href: "/private-dining", sub: "Track every private dining party from first inquiry to dinner night." },
    // Own tab (Jay, 2026-10-19: "watch list on the main nav, not hidden in inbox"). Page lives in the Inbox app.
    { label: "Watch List", title: "Watch List", href: "/inbox/watch", sub: "See the press and critics to know, and who of them is booked in the next 14 days.", more: true },
    { label: "Lineup", title: "Lineup", href: "/lineup", sub: "Learn the menu and service, then test what you know.", external: true, more: true }
  ];
  var P = 'aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    ext: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    down: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    out: '<svg ' + P + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>'
  };
  var FILES = { "/iara_home.html": "/home", "/iara_hub.html": "/", "/iara_staff_hub.html": "/lineup", "/iara_kitchen_ops.html": "/ops", "/iara_analytics.html": "/analytics" };
  function here() { var p = location.pathname; return FILES[p] || p; }
  function currentApp() {
    var p = here(), best = null;
    APPS.forEach(function (a) { if (p === a.href || p.indexOf(a.href + "/") === 0) best = a; });
    return best;   // null on a page with no tab (e.g. Lineup solo): no tab is marked
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var account = null, bars = [];

  function menu(id, cls, btnHtml, label, itemsHtml) {
    return '<div class="k-menu"><button type="button" class="' + cls + '" aria-haspopup="menu" aria-expanded="false" aria-controls="' + id + '" aria-label="' + label + '">' + btnHtml + '</button>' +
      '<div class="k-menu-list" role="menu" id="' + id + '" hidden>' + itemsHtml + '</div></div>';
  }

  function render(el) {
    var cur = currentApp();
    var name = el.getAttribute("data-app") || (cur ? cur.title : "iara Staff");
    var solo = el.getAttribute("data-mode") === "solo";   // Lineup: its own instance, no manager tabs or search
    if (solo) document.documentElement.setAttribute("data-k-nav", "solo");
    var lists = "";
    var shown = APPS.filter(function (a) { return !a.hidden; });
    var tabs = solo ? "" : '<nav class="k-apptabs" aria-label="Manager apps">' + shown.map(function (a) {
      var on = cur && (a === cur || a.href === cur.parent);
      if (a.menu) {
        // Button in the (sideways-scrolling) tab row; its list lives outside the row so it is never clipped.
        var id = "k-tabmenu-" + a.href.slice(1), p = here(), best = null;
        a.menu.forEach(function (m) { if (p === m.href || p.indexOf(m.href + "/") === 0) { if (!best || m.href.length > best.href.length) best = m; } });
        lists += '<div class="k-menu-list k-menu-fixed" role="menu" id="' + id + '" aria-label="' + a.label + '" hidden>' + a.menu.map(function (m) {
          return '<a class="k-menu-item" role="menuitem" href="' + m.href + '"' + (m === best ? ' aria-current="page"' : "") + ">" + m.label + "</a>";
        }).join("") + "</div>";
        return '<button type="button" class="k-apptab" aria-haspopup="menu" aria-expanded="false" aria-controls="' + id + '"' + (on ? ' aria-current="page"' : "") + ">" + a.label + ICON.down + "</button>";
      }
      return '<a class="k-apptab" href="' + a.href + '"' + (on ? ' aria-current="page"' : "") + (a.more ? " data-k-overflow" : "") +
        (a.external ? ' target="_blank" rel="noopener" aria-label="' + a.label + ', opens in a new tab"' : "") + ">" + a.label + (a.external ? ICON.ext : "") + "</a>";
    }).join("") + moreTab(shown, cur) + "</nav>";
    if (!solo) lists += moreList(shown, cur);
    el.innerHTML = '<header class="k-appbar"' + (solo ? ' data-mode="solo"' : "") + '><div class="k-appbar-inner">' +
      '<a class="k-appbar-mark" href="' + (solo ? "/" : "/home") + '" aria-label="' + (solo ? "iara Staff, home" : "Manager Home") + '"><img src="/kit/iara-orange.svg" alt="iara"></a>' +
      '<span class="k-appbar-title"><span class="k-roll"><span class="k-roll-in">' + esc(name) + "</span></span></span>" +
      tabs + '<div class="k-appbar-spacer"></div>' + (solo ? "" : "<span data-k-palette-slot></span>") +
      '<span data-k-acct class="k-acct-slot"></span>' + lists + '</div></header>';
    var slot = el.querySelector("[data-k-palette-slot]");
    if (slot && window.iaraPalette) slot.appendChild(window.iaraPalette.trigger());
    var row = el.querySelector(".k-apptabs");
    if (row) {
      row.addEventListener("scroll", function () { closeAll(); }, { passive: true });
      showCurrent(row);
    }
    paintAccount(el);
    roll(el.querySelector(".k-roll"), name);
    // The one-line subtitle (what this app does) goes wherever the app put [data-k-subtitle].
    document.querySelectorAll("[data-k-subtitle]").forEach(function (p) { if (cur) p.textContent = cur.sub; p.classList.add("k-app-sub"); });
  }

  // Phone-only "More" tab (CSS shows it under 480px): a menu of the `more` tabs. Marked current when one of them is.
  function moreTab(shown, cur) {
    var on = shown.some(function (a) { return a.more && a === cur; });
    return '<button type="button" class="k-apptab k-apptab-more" aria-haspopup="menu" aria-expanded="false" aria-controls="k-tabmenu-more"' + (on ? ' aria-current="page"' : "") + ">More" + ICON.down + "</button>";
  }
  function moreList(shown, cur) {
    return '<div class="k-menu-list k-menu-fixed" role="menu" id="k-tabmenu-more" aria-label="More apps" hidden>' + shown.filter(function (a) { return a.more; }).map(function (a) {
      return '<a class="k-menu-item" role="menuitem" href="' + a.href + '"' + (a === cur ? ' aria-current="page"' : "") +
        (a.external ? ' target="_blank" rel="noopener" aria-label="' + a.label + ', opens in a new tab"' : "") + ">" + a.label + (a.external ? ICON.ext : "") + "</a>";
    }).join("") + "</div>";
  }
  // The row scrolls sideways under 1100px: bring the current tab into view (row only, never the page).
  function showCurrent(row) {
    var on = Array.prototype.filter.call(row.querySelectorAll('[aria-current="page"]'), function (t) { return t.offsetParent; })[0];
    if (!on || row.scrollWidth <= row.clientWidth) return;
    var r = row.getBoundingClientRect(), t = on.getBoundingClientRect();
    if (t.right > r.right - 32) row.scrollLeft += t.right - r.right + 40;
    else if (t.left < r.left) row.scrollLeft -= r.left - t.left + 8;
  }

  // Account menu repaints on its own, so a late sign-in never interrupts the name roll.
  function paintAccount(el) {
    var box = el.querySelector("[data-k-acct]"); if (!box) return;
    box.innerHTML = account ? menu("k-acct-menu", "k-appbar-btn", '<span class="k-avatar">' + esc((account.email || "?").charAt(0)) + "</span>", account.email ? "Account, " + esc(account.email) : "Account",
      '<div class="k-menu-label">' + esc(account.email || "Signed in") + '</div><div class="k-menu-sep" role="separator"></div>' +
      (account.signOut ? '<button type="button" class="k-menu-item" role="menuitem" data-k-signout>' + ICON.out + "<span>Sign Out</span></button>" : "")) : "";
    var so = box.querySelector("[data-k-signout]");
    // Focus the account button first: the menu item is about to be hidden, so a
    // confirm dialog opened by signOut() returns focus somewhere real on Cancel.
    if (so) so.addEventListener("click", function () { closeAll(); var ab = box.querySelector("[aria-haspopup=menu]"); if (ab) ab.focus(); account.signOut(); });
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
    // Desktop only. Browsers with cross-document View Transitions roll the title in CSS
    // (staff.css) while the bar stays still; this script is the fallback for the rest.
    if (!(window.matchMedia && matchMedia("(min-width: 1100px)").matches) || "onpagereveal" in window) return;
    var out = document.createElement("span"); out.className = "k-roll-out"; out.setAttribute("aria-hidden", "true"); out.textContent = prev;
    box.appendChild(out);
    var opts = { duration: 600, easing: "cubic-bezier(0.65, 0, 0.35, 1)" };
    box.querySelector(".k-roll-in").animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], opts);
    out.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], opts).onfinish = function () { out.remove(); };
  }

  function closeAll(except) {
    document.querySelectorAll(".k-appbar .k-menu-list").forEach(function (m) {
      if (m === except) return;
      m.hidden = true;
      var b = btnOf(m); if (b) b.setAttribute("aria-expanded", "false");
    });
  }
  function btnOf(m) { return document.querySelector('[aria-controls="' + m.id + '"]'); }
  // Fixed menus (tab menus) hang under their button, clamped to the viewport.
  function place(m) {
    if (!m.classList.contains("k-menu-fixed")) return;
    var r = btnOf(m).getBoundingClientRect(), w = m.offsetWidth, vw = document.documentElement.clientWidth;
    m.style.top = Math.round(r.bottom + 6) + "px";
    m.style.left = Math.round(Math.max(12, Math.min(r.left, vw - w - 12))) + "px";
  }
  window.addEventListener("resize", function () { document.querySelectorAll(".k-appbar .k-menu-fixed:not([hidden])").forEach(place); });
  function items(m) { return Array.prototype.slice.call(m.querySelectorAll('[role="menuitem"]')); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".k-appbar [aria-haspopup=menu]");
    if (b) {
      var m = document.getElementById(b.getAttribute("aria-controls")), opening = m.hidden;
      closeAll(m); m.hidden = !opening; b.setAttribute("aria-expanded", String(opening));
      if (opening) { place(m); var it = items(m); (it.filter(function (x) { return x.getAttribute("aria-current"); })[0] || it[0] || b).focus(); }
      return;
    }
    if (!(e.target.closest && e.target.closest(".k-menu-list")) || e.target.closest("a.k-menu-item")) closeAll();   // a picked link (e.g. Lineup in a new tab) closes its menu
  });
  document.addEventListener("keydown", function (e) {
    var m = document.activeElement && document.activeElement.closest && document.activeElement.closest(".k-appbar .k-menu-list");
    if (!m) return;
    var it = items(m), i = it.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeAll(); btnOf(m).focus(); }
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
