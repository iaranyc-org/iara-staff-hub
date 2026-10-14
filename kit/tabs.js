/* iara staff kit: tabs keyboard helper for STATIC apps. Edit here, run sync.sh.
   WAI-ARIA tabs pattern: one Tab stop per tablist (roving tabindex), Left/Right move
   (wrapping), Home/End jump, and moving focus activates (we click the tab, so your existing
   click handler runs). Works on every [role="tablist"] now and later (MutationObserver).
   Selection must be shown with aria-selected="true" (the .k-tab style keys off it).
   Load with <script src="/kit/tabs.js" defer></script>. */
(function () {
  function tabsOf(list) {
    return Array.prototype.filter.call(list.querySelectorAll('[role="tab"]'), function (t) {
      return t.closest('[role="tablist"]') === list && !t.disabled && t.offsetParent !== null;
    });
  }
  function sync(list) {
    var tabs = tabsOf(list); if (!tabs.length) return;
    var sel = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    tabs.forEach(function (t) { t.tabIndex = t === sel ? 0 : -1; });
  }
  function syncAll() { document.querySelectorAll('[role="tablist"]').forEach(sync); }
  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('[role="tab"]'); if (!tab) return;
    var list = tab.closest('[role="tablist"]'); if (!list) return;
    var tabs = tabsOf(list), i = tabs.indexOf(tab), n = tabs.length, j = -1;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    tabs[j].focus(); tabs[j].click();
    if (tabs[j].scrollIntoView) tabs[j].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    sync(list);
  });
  document.addEventListener('click', function (e) {
    var list = e.target.closest && e.target.closest('[role="tablist"]'); if (list) setTimeout(function () { sync(list); });
  });
  var queued = false;
  new MutationObserver(function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; syncAll(); }); })
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncAll); else syncAll();
})();
