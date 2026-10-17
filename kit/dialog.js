/* ==========================================================================
   iara staff kit: native <dialog> helpers for STATIC apps. Vanilla, no deps.
   Needs tokens.css + staff.css (dialog.k-dialog / dialog.k-sheet).

   Markup:  <dialog class="k-dialog" id="edit" aria-labelledby="edit-t">…</dialog>   (or class="k-sheet")
            <button data-k-dialog-open="edit">Edit Party</button>
            <button data-k-dialog-close>Cancel</button>  (data-k-dialog-close="save" sets returnValue)
   JS:      const value = await iaraDialog.open("edit")   // or a <dialog> element; resolves on close
            iaraDialog.close("edit", "save")
   Gives: showModal (focus trapped, page inert), Escape closes, click on the scrim closes
   (data-k-static on the dialog turns that off), focus returns to the opener, page scroll locked
   while any dialog is open, first focus = [autofocus] or the first control.
   Load with <script src="/kit/dialog.js" defer></script>. Next twin: components/ui/dialog + sheet.
   ========================================================================== */
(function () {
  if (window.iaraDialog) return;
  var waiters = new WeakMap();

  function el(d) { return typeof d === "string" ? document.getElementById(d) : d; }
  function lock() { document.documentElement.classList.toggle("k-dialog-open", !!document.querySelector("dialog.k-dialog[open], dialog.k-sheet[open]")); }

  function wire(d) {
    if (d.__kWired) return; d.__kWired = true;
    d.addEventListener("close", function () {
      lock();
      var w = waiters.get(d); waiters.delete(d);
      var o = d.__kOpener; d.__kOpener = null;
      if (o && o.isConnected && o.focus) o.focus();
      if (w) w(d.returnValue);
    });
    // Scrim click: the click lands on the <dialog> itself, outside its box.
    d.addEventListener("click", function (e) {
      if (e.target !== d || d.hasAttribute("data-k-static")) return;
      var r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(d, "");
    });
    if (window.iaraTip) d.addEventListener("cancel", function () { window.iaraTip.close(); });
  }

  function open(d, opts) {
    d = el(d); opts = opts || {};
    if (!d) return Promise.reject(new Error("iaraDialog.open: no such dialog"));
    wire(d);
    if (d.open) return new Promise(function (res) { waiters.set(d, res); });
    d.__kOpener = opts.opener || document.activeElement;
    d.returnValue = "";
    if (window.iaraTip) window.iaraTip.close();
    d.showModal();
    lock();
    var f = d.querySelector("[autofocus]") || d.querySelector("input:not([type=hidden]), select, textarea, button, [href], [tabindex]:not([tabindex='-1'])");
    if (f) f.focus();
    return new Promise(function (res) { waiters.set(d, res); });
  }
  function close(d, value) { d = el(d); if (d && d.open) d.close(value == null ? "" : String(value)); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-k-dialog-open], [data-k-dialog-close]");
    if (!t) return;
    if (t.hasAttribute("data-k-dialog-open")) { e.preventDefault(); open(t.getAttribute("data-k-dialog-open"), { opener: t }); }
    else { var d = t.closest("dialog"); if (d) { e.preventDefault(); close(d, t.getAttribute("data-k-dialog-close")); } }
  });

  // showModal makes the page inert, but Tab past the last control goes to the browser chrome.
  // Wrap it inside the top dialog instead, so keyboard focus never leaves.
  var FOC = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var all = document.querySelectorAll("dialog.k-dialog[open], dialog.k-sheet[open]"), d = all[all.length - 1];
    if (!d) return;
    var f = Array.prototype.filter.call(d.querySelectorAll(FOC), function (x) { return x.offsetParent !== null || x === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || !d.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !d.contains(a))) { e.preventDefault(); first.focus(); }
  });

  window.iaraDialog = { open: open, close: close };
})();
