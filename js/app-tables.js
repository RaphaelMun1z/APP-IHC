"use strict";

// Comportamentos compartilhados das tabelas de consulta. As grades de frequência
// e avaliação mantêm seu controlador de cabeçalho compacto em table-header.js.
(() => {
  const mounted = new Map();
  const navbar = document.querySelector("body > nav");
  function mount(table) {
    const region = table.closest(".app-table-region");
    if (!region || !table.tHead) return;
    const headers = [...table.tHead.rows[0].cells];
    const modal = table.closest("#app-modal");
    const floating = document.createElement("div");
    floating.className = "app-table-floating";
    floating.dataset.inModal = String(Boolean(modal));
    floating.setAttribute("aria-hidden", "true");
    floating.inert = true;
    const copy = table.cloneNode(false);
    copy.removeAttribute("id");
    copy.dataset.tableCopy = "true";
    const head = table.tHead.cloneNode(true);
    head.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    copy.append(head);
    floating.append(copy);
    document.body.append(floating);
    const copies = [...head.rows[0].cells];
    let frame = 0, activeCell = null, focusCell = null, hoverCell = null;
    function highlight(cell) {
      if (cell === activeCell) return;
      activeCell = cell;
      const column = cell?.colSpan === 1 ? cell.cellIndex : -1;
      for (const row of table.rows) {
        row.dataset.tableRowActive = String(row === cell?.parentElement && row.parentElement.tagName === "TBODY");
        for (const item of row.cells) item.dataset.tableColumnActive = String(item.cellIndex === column);
      }
      copies.forEach((item, index) => { item.dataset.tableColumnActive = String(index === column); });
    }
    function onHover(event) { hoverCell = event.target.closest("td, th"); highlight(hoverCell || focusCell); }
    function onLeave() { hoverCell = null; highlight(focusCell); }
    function onFocus(event) { focusCell = event.target.closest("td, th"); highlight(focusCell || hoverCell); }
    function onBlur(event) { focusCell = region.contains(event.relatedTarget) ? event.relatedTarget?.closest("td, th") : null; highlight(focusCell || hoverCell); }
    function position() {
      frame = 0;
      const rect = table.getBoundingClientRect();
      const bounds = region.getBoundingClientRect();
      const height = table.tHead.getBoundingClientRect().height;
      const top = modal ? 16 : Math.max(0, navbar?.getBoundingClientRect().bottom || 0);
      const modalOpen = document.querySelector('#app-modal[aria-modal="true"]');
      const visible = region.getClientRects().length && bounds.width > 0 && rect.top < top && rect.bottom > top + height && (!modalOpen || modalOpen === modal);
      if (!visible) { floating.style.display = "none"; return; }
      let offset = 0;
      headers.forEach((header, index) => {
        const width = header.getBoundingClientRect().width;
        copies[index].style.width = `${width}px`;
        copies[index].style.minWidth = `${width}px`;
        copies[index].style.transform = header.classList.contains("app-table-identity") ? `translateX(${Math.max(0, region.scrollLeft - offset)}px)` : "";
        offset += width;
      });
      copy.style.width = `${offset}px`;
      copy.style.transform = `translateX(${-region.scrollLeft}px)`;
      Object.assign(floating.style, { display: "block", top: `${top}px`, left: `${bounds.left + region.clientLeft}px`, width: `${region.clientWidth}px`, height: `${height}px` });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(position); }
    region.addEventListener("pointerover", onHover);
    region.addEventListener("pointerleave", onLeave);
    region.addEventListener("focusin", onFocus);
    region.addEventListener("focusout", onBlur);
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    [table, region, navbar, modal].filter(Boolean).forEach(el => resize.observe(el));
    // Abertura de modal oculta cabeçalhos da página que estiverem atrás dele.
    const modalState = document.getElementById("app-modal");
    const visibility = new MutationObserver(schedule);
    if (modalState) visibility.observe(modalState, { attributes: true, attributeFilter: ["class", "aria-modal"] });
    schedule();
    mounted.set(table, () => {
      cancelAnimationFrame(frame);
      resize.disconnect(); visibility.disconnect();
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      region.removeEventListener("pointerover", onHover);
      region.removeEventListener("pointerleave", onLeave);
      region.removeEventListener("focusin", onFocus);
      region.removeEventListener("focusout", onBlur);
      floating.remove();
    });
  }
  function sync() {
    for (const [table, dispose] of mounted) if (!table.isConnected) { dispose(); mounted.delete(table); }
    document.querySelectorAll(".app-table:not([data-table-copy])").forEach(table => { if (!mounted.has(table)) mount(table); });
  }
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; sync(); });
  }).observe(document.body, { childList: true, subtree: true });
  sync();
})();
