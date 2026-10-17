/* ==========================================================================
   iara staff kit: toasts for STATIC apps. Vanilla, no deps. Needs staff.css (.k-toaster/.k-toast).
   Replaces the hand-rolled toast() in Lineup (iara_staff_hub.html) and Ops (iara_kitchen_ops.html).

   iaraToast("Hold released.")                                   // 4s
   iaraToast("Deleted Yuca.", { undo: () => restore(id) })       // Undo button, 5s window
   iaraToast("Approved. Posting soon.", { undo: unpost, duration: 10000 })  // 10s for sends/posts
   iaraToast("Couldn't save. Try again.", { kind: "error", action: { label: "Try Again", onClick: save } })
   Returns { dismiss() }. UX-WRITING §16: past tense, object first, one action max.
   Bottom centre, stacked (max 3), polite live region (errors assertive). The timer pauses while the
   pointer or focus is on a toast. Motion: transform only, off under reduced motion.
   Load with <script src="/kit/toast.js" defer></script>. Next twin: src/kit/toast.ts (Sonner).
   ========================================================================== */
(function () {
  if (window.iaraToast) return;
  var box, polite, assertive, MAX = 3;
  function root() {
    if (box) return box;
    box = document.createElement("div"); box.className = "k-toaster";
    polite = document.createElement("div"); polite.setAttribute("role", "status"); polite.setAttribute("aria-live", "polite"); polite.className = "k-sr-only";
    assertive = document.createElement("div"); assertive.setAttribute("role", "alert"); assertive.className = "k-sr-only";
    document.body.append(box, polite, assertive);
    return box;
  }
  var ICON = {
    success: '<svg class="k-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error: '<svg class="k-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
  };

  function iaraToast(message, opts) {
    opts = opts || {};
    var kind = opts.kind || (opts.undo ? "success" : "info");
    var action = opts.undo ? { label: "Undo", onClick: opts.undo } : opts.action;
    var duration = opts.duration || (opts.undo ? 5000 : kind === "error" ? 8000 : 4000);
    var t = document.createElement("div");
    t.className = "k-toast"; t.setAttribute("data-kind", kind);
    t.innerHTML = (ICON[kind] || "") + '<span class="k-toast-msg"></span>';
    t.querySelector(".k-toast-msg").textContent = message;
    if (action) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = action.label;
      b.addEventListener("click", function () { dismiss(); action.onClick && action.onClick(); });
      t.appendChild(b);
    }
    var r = root(); r.appendChild(t);
    while (r.children.length > MAX) r.firstElementChild.remove();
    // Announce through a live region that already exists (new nodes in a new region are often missed).
    var live = kind === "error" ? assertive : polite;
    live.textContent = ""; setTimeout(function () { live.textContent = message + (action ? ". " + action.label + " available." : ""); }, 50);

    var left = duration, started = Date.now(), paused = false, timer = setTimeout(dismiss, left);
    function pause() { if (paused) return; paused = true; clearTimeout(timer); left -= Date.now() - started; }
    function resume() { if (!paused || t.matches(":hover") || t.contains(document.activeElement)) return; paused = false; started = Date.now(); timer = setTimeout(dismiss, Math.max(left, 1500)); }
    t.addEventListener("pointerenter", pause); t.addEventListener("pointerleave", resume);
    t.addEventListener("focusin", pause); t.addEventListener("focusout", function () { setTimeout(resume, 0); });
    function dismiss() { clearTimeout(timer); t.remove(); }
    return { dismiss: dismiss };
  }
  window.iaraToast = iaraToast;
})();
