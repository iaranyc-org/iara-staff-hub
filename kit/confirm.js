/* ==========================================================================
   iara staff kit: confirmation dialog for STATIC apps. Vanilla JS, no deps.
   Kit v2: built on a native <dialog> via dialog.js (loaded on demand from the
   same folder if the page didn't). Needs tokens.css + staff.css.

   Use:  if (await iaraConfirm({
           title: "Delete Yuca?",                    // question: verb + object
           body: "This removes it from ingredients.",  // the consequence, specific
           confirmLabel: "Delete Ingredient",          // repeats the verb
           cancelLabel: "Keep Ingredient",             // default "Cancel"
           destructive: true                           // default true: danger button
         })) { ...do it... }
         <script src="/kit/confirm.js" defer></script>
   Only for destructive or costly actions (UX-WRITING §17). Resolves true on
   confirm, false on cancel / Escape / scrim. Focus starts on the cancel
   button, is trapped (modal dialog), and returns to the opener on close.
   Next twin: useConfirm() / <ConfirmDialog> in src/kit/confirm.tsx.
   ========================================================================== */
(function () {
  if (window.iaraConfirm) return;
  var n = 0, here = (document.currentScript && document.currentScript.src) || "/kit/confirm.js";

  function needDialog() {
    if (window.iaraDialog) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = here.replace(/confirm\.js(\?.*)?$/, "dialog.js");
      s.onload = function () { res(); }; s.onerror = rej; document.head.appendChild(s);
    });
  }

  function iaraConfirm(opts) {
    opts = opts || {};
    var opener = document.activeElement;
    return needDialog().then(function () {
      var id = "k-confirm-" + (++n);
      var d = document.createElement("dialog");
      d.className = "k-dialog k-dialog-sm";
      d.setAttribute("role", "alertdialog");
      d.setAttribute("aria-labelledby", id + "-t");
      if (opts.body) d.setAttribute("aria-describedby", id + "-b");
      d.innerHTML = '<h2 class="k-dialog-title" style="padding-right:0" id="' + id + '-t"></h2>' +
        (opts.body ? '<p class="k-dialog-body" id="' + id + '-b"></p>' : "") +
        '<div class="k-dialog-actions">' +
          '<button type="button" class="k-btn k-btn-secondary" data-k-dialog-close="cancel" autofocus></button>' +
          '<button type="button" class="k-btn ' + (opts.destructive === false ? "k-btn-primary" : "k-btn-danger") + '" data-k-dialog-close="ok"></button>' +
        "</div>";
      d.querySelector(".k-dialog-title").textContent = opts.title || "";
      if (opts.body) d.querySelector(".k-dialog-body").textContent = opts.body;
      d.querySelector('[data-k-dialog-close="cancel"]').textContent = opts.cancelLabel || "Cancel";
      d.querySelector('[data-k-dialog-close="ok"]').textContent = opts.confirmLabel || "Confirm";
      document.body.appendChild(d);
      // Escape must not also reach the app's own modal/shortcut handlers underneath.
      function stop(e) { if (d.open && e.key === "Escape") e.stopPropagation(); }
      document.addEventListener("keydown", stop, true);
      return window.iaraDialog.open(d, { opener: opener }).then(function (v) {
        document.removeEventListener("keydown", stop, true);
        d.remove();
        return v === "ok";
      });
    });
  }
  window.iaraConfirm = iaraConfirm;
})();
