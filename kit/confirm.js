/* ==========================================================================
   iara staff kit: confirmation dialog for STATIC apps. Vanilla JS, no deps.
   Needs tokens.css + staff.css (.k-confirm styles).

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
   button, is trapped inside, and returns to the opener on close.
   ========================================================================== */
(function () {
  if (window.iaraConfirm) return;
  var n = 0;

  function iaraConfirm(opts) {
    opts = opts || {};
    var id = "k-confirm-" + (++n), opener = document.activeElement;
    var root = document.createElement("div");
    root.className = "k-confirm";
    root.innerHTML =
      '<div class="k-confirm-scrim" data-k-cancel></div>' +
      '<div class="k-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="' + id + '-t"' + (opts.body ? ' aria-describedby="' + id + '-b"' : "") + ">" +
        '<h2 class="k-confirm-title" id="' + id + '-t"></h2>' +
        (opts.body ? '<p class="k-confirm-body" id="' + id + '-b"></p>' : "") +
        '<div class="k-confirm-actions">' +
          '<button type="button" class="k-btn k-btn-secondary" data-k-cancel></button>' +
          '<button type="button" class="k-btn ' + (opts.destructive === false ? "k-btn-primary" : "k-btn-danger") + '" data-k-ok></button>' +
        "</div></div>";
    root.querySelector(".k-confirm-title").textContent = opts.title || "";
    if (opts.body) root.querySelector(".k-confirm-body").textContent = opts.body;
    var cancel = root.querySelector("button[data-k-cancel]"), ok = root.querySelector("[data-k-ok]");
    cancel.textContent = opts.cancelLabel || "Cancel";
    ok.textContent = opts.confirmLabel || "Confirm";
    document.body.appendChild(root);
    document.documentElement.classList.add("k-confirm-open");
    if (window.iaraTip) window.iaraTip.close();
    cancel.focus();

    return new Promise(function (resolve) {
      var done = false;
      function finish(v) {
        if (done) return; done = true;
        document.removeEventListener("keydown", onKey, true);
        root.remove();
        if (!document.querySelector(".k-confirm")) document.documentElement.classList.remove("k-confirm-open");
        if (opener && opener.isConnected && opener.focus) opener.focus();
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); return; }
        if (e.key === "Tab") {
          var f = [cancel, ok], i = f.indexOf(document.activeElement);
          e.preventDefault();
          f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
          return;
        }
        // Keep other app shortcuts (palette "/", modal keys) from firing underneath.
        e.stopPropagation();
      }
      // Capture phase so the app's own modal Escape handler doesn't also close its modal.
      document.addEventListener("keydown", onKey, true);
      root.addEventListener("click", function (e) {
        if (e.target.closest("[data-k-ok]")) finish(true);
        else if (e.target.closest("[data-k-cancel]")) finish(false);
      });
      // Focus can't wander out (e.g. a click on the scrim).
      root.addEventListener("focusout", function (e) { if (!done && !root.contains(e.relatedTarget)) setTimeout(function () { if (!done && !root.contains(document.activeElement)) cancel.focus(); }, 0); });
    });
  }
  window.iaraConfirm = iaraConfirm;
})();
