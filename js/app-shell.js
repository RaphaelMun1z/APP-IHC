"use strict";

(() => {
  const D = window.AppData;
  const file = location.pathname.split("/").pop() || "index.html";
  const pages = [
    ["inicio.html", "Início", "home"], ["turmas.html", "Minhas turmas", "users"], ["registro-aula.html", "Registro de aula", "book"], ["presencas.html", "Frequência", "calendar"], ["index.html", "Avaliação", "check"], ["historico.html", "Histórico", "clock"], ["coordenacao.html", "Coordenação", "settings"], ["turma-form.html", "Turma", "users"]
  ];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3ZM8 7h8m-8 4h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-14 4h2m3 0h2m3 0h1"/>',
    check: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    settings: '<path d="M4 3v7m0 4v7M12 3v3m0 4v11M20 3v11m0 4v3M1 10h6m2-4h6m2 8h6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM7 3v5h8V3M7 21v-8h10v8"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  const icon = name => `<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  const user = D.session();
  const pendingChanges = [];
  const registerUnsaved = (check, clear) => pendingChanges.push({ check, clear });
  window.addEventListener("beforeunload", event => {
    if (pendingChanges.some(item => item.check())) { event.preventDefault(); event.returnValue = ""; }
  });
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  function safeReturn() {
    const raw = new URLSearchParams(location.search).get("retorno") || "inicio.html";
    const url = new URL(raw, location.href);
    const target = url.pathname.split("/").pop();
    return url.origin === location.origin && pages.some(p => p[0] === target) && (!["coordenacao.html", "turma-form.html"].includes(target) || D.session()?.perfil === "coordenacao") ? `./${target}${url.search}` : "./inicio.html";
  }
  if (file !== "login.html" && !user) {
    location.replace(`./login.html?retorno=${encodeURIComponent(file + location.search)}`);
    return;
  }
  if (["coordenacao.html", "turma-form.html"].includes(file) && user?.perfil !== "coordenacao") {
    location.replace("./inicio.html");
    return;
  }
  function notice(message, error = false, target = document.getElementById("app-feedback")) {
    if (!target) return;
    target.hidden = !message;
    target.className = `app-feedback ${error ? "is-error" : "is-success"}`;
    target.setAttribute("role", error ? "alert" : "status");
    target.textContent = message;
  }
  function options(items, selected = "", placeholder = "Selecione") {
    return `<option value="">${esc(placeholder)}</option>` + items.map(i => `<option value="${esc(i.id)}"${i.id === selected ? " selected" : ""}>${esc(i.nome)}</option>`).join("");
  }
  let modal, opener;
  function showModal(title, content, afterOpen) {
    const host = document.getElementById("app-modal");
    if (!host) return;
    opener = document.activeElement;
    document.getElementById("app-modal-title").textContent = title;
    document.getElementById("app-modal-body").innerHTML = content;
    modal.show();
    afterOpen?.();
    host.querySelector("input:not([type=hidden]), select, textarea, [data-modal-close]")?.focus();
  }
  const hideModal = () => modal?.hide();
  window.AppUI = Object.freeze({ esc, icon, notice, options, showModal, hideModal, safeReturn, pages, user, registerUnsaved });
  if (file === "login.html") return;

  const nav = document.querySelector("body > nav");
  nav.className = "site-navbar app-navbar fixed start-0 top-0 z-40 w-full border-b border-default";
  nav.innerHTML = `<div class="app-navbar-inner">
    <a href="./inicio.html" class="app-brand" aria-label="Voltar ao menu principal"><img src="./assets/ipb_logo.png" alt="IPB" class="h-10 w-auto"><span class="site-brand-name">APP 1</span></a>
    <div class="app-account">
      <button type="button" id="user-menu-button" aria-expanded="false" aria-controls="user-dropdown" aria-haspopup="true" aria-label="Abrir opções de ${esc(user.nome)}" class="app-profile"><span class="app-avatar">${user.perfil === "professor" ? "MO" : "CP"}</span><span class="app-profile-label">${user.perfil === "professor" ? "Professor" : "Coordenação"}</span><span class="user-menu-chevron">${icon("down")}</span></button>
      <div id="user-dropdown" class="z-50 hidden w-64 rounded-base border border-default bg-neutral-primary">
        <div class="border-b border-default px-4 py-3"><p class="text-sm font-semibold text-heading">${esc(user.nome)}</p><p class="text-xs text-body-subtle">${user.perfil === "professor" ? "Professor" : "Coordenação"} · Demonstração</p></div>
        <ul class="space-y-1 p-2 text-sm"><li><button type="button" id="app-profile-info" class="app-dropdown-item">${icon("users")}Meu perfil</button></li><li><button type="button" id="app-logout" class="app-dropdown-item app-logout">${icon("logout")}Sair da conta</button></li></ul>
      </div>
    </div>
  </div>`;
  const trigger = document.getElementById("user-menu-button");
  const menu = document.getElementById("user-dropdown");
  const dropdown = new Dropdown(menu, trigger, { placement: "bottom-end", onShow: () => trigger.setAttribute("aria-expanded", "true"), onHide: () => trigger.setAttribute("aria-expanded", "false") });
  trigger.addEventListener("keydown", event => { if (event.key === "ArrowDown") { event.preventDefault(); dropdown.show(); menu.querySelector("button").focus(); } });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && dropdown.isVisible()) { dropdown.hide(); trigger.focus(); } });
  document.getElementById("app-logout").addEventListener("click", () => {
    if (pendingChanges.some(item => item.check())) {
      if (!window.confirm("Há alterações não salvas. Deseja descartá-las e sair?")) return;
      pendingChanges.forEach(item => item.clear());
    }
    D.logout(); location.href = "./login.html";
  });
  document.getElementById("app-profile-info").addEventListener("click", () => { dropdown.hide(); showModal("Meu perfil", `<div class="space-y-4"><div class="app-icon-tile">${icon("users")}</div><h3 class="text-lg font-semibold text-heading">${esc(user.nome)}</h3><p>Perfil: ${user.perfil === "professor" ? "Professor" : "Coordenação pedagógica"}</p><p class="app-help">Conta demonstrativa. Os registros ficam neste navegador e não são enviados a um servidor.</p><a href="./turmas.html" class="app-btn app-btn-primary">Ver minhas turmas ${icon("arrow")}</a></div>`); });
  const container = document.createElement("div");
  container.innerHTML = `<div id="app-modal" tabindex="-1" aria-hidden="true" aria-labelledby="app-modal-title" class="fixed inset-0 z-50 hidden h-full w-full overflow-y-auto p-4"><div class="relative my-auto w-full max-w-3xl rounded-base border border-default bg-neutral-primary"><div class="flex items-center justify-between gap-3 border-b border-default p-5"><h2 id="app-modal-title" class="text-xl font-semibold text-heading"></h2><button type="button" data-modal-close aria-label="Fechar janela" class="app-btn app-btn-ghost">${icon("close")}</button></div><div id="app-modal-body" class="p-5 sm:p-6"></div></div></div>`;
  document.body.append(container.firstElementChild);
  const host = document.getElementById("app-modal");
  modal = new Modal(host, { backdropClasses: "bg-gray-900/60 fixed inset-0 z-40", onHide: () => opener?.focus() });
  host.querySelector("[data-modal-close]").addEventListener("click", hideModal);
  host.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const focusable = [...host.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
})();
