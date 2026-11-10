"use strict";

(() => {
  const D = window.AppData;
  const requestedFile = location.pathname.split("/").pop();
  const file = !requestedFile || requestedFile === "index.html" ? "inicio.html" : requestedFile;
  const pages = [
    ["inicio.html", "Início", "home"], ["turmas.html", "Minhas turmas", "users"], ["registro-aula.html", "Registro de aula", "book"], ["presencas.html", "Frequência", "calendar"], ["avaliacao.html", "Avaliação", "check"], ["historico.html", "Histórico", "clock"], ["coordenacao.html", "Coordenação", "settings"], ["turma-form.html", "Turma", "users"]
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
    trash: '<path d="M3 6h18m-2 0-1 14H6L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
    open: '<path d="M14 3h7v7m0-7-9 9"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  const icon = name => `<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  const user = D.session();
  const navigationGroups = [
    { id: "ensino", title: "Ensino", items: [
      { href: "turmas.html", title: "Minhas turmas", description: "Alunos, cursos e horários.", icon: "users" },
      { href: "registro-aula.html", title: "Registrar aula", description: "Conteúdos e lições da turma.", icon: "book" }
    ] },
    { id: "acompanhamento", title: "Acompanhamento", items: [
      { href: "presencas.html", title: "Frequência", description: "Presenças e faltas dos alunos.", icon: "calendar" },
      { href: "avaliacao.html", title: "Avaliação", description: "Desenvolvimento de cada aluno.", icon: "check" }
    ] },
    { id: "historico", title: "Histórico", items: [
      { href: "historico.html?tipo=aula", title: "Aulas e conteúdos", description: "Consulte as aulas registradas.", icon: "book" },
      { href: "historico.html?tipo=frequencia", title: "Frequências", description: "Consulte as chamadas anteriores.", icon: "calendar" },
      { href: "historico.html?tipo=avaliacao", title: "Avaliações", description: "Reveja os registros dos alunos.", icon: "clock" }
    ] },
    { id: "conta", title: user?.perfil === "coordenacao" ? "Gestão e conta" : "Minha conta", items: [
      ...(user?.perfil === "coordenacao" ? [
        { href: "coordenacao.html", title: "Coordenação", description: "Gerencie turmas e professores.", icon: "settings" },
        { href: "turma-form.html", title: "Nova turma", description: "Organize uma nova turma.", icon: "plus" }
      ] : []),
      { action: "profile", title: "Meu perfil", description: "Confira seus dados de acesso.", icon: "users" },
      { action: "logout", title: "Sair da conta", description: "Encerre sua sessão.", icon: "logout" }
    ] }
  ];
  function navigationItem(item) {
    const current = item.href && item.href === file + location.search;
    const tag = item.href ? "a" : "button";
    const attrs = item.href ? `href="./${esc(item.href)}"${current ? ' aria-current="page"' : ""}` : `type="button" data-app-action="${esc(item.action)}"`;
    return `<${tag} ${attrs} class="app-nav-item"><span class="app-nav-icon">${icon(item.icon)}</span><span class="app-nav-copy"><span class="app-nav-title">${esc(item.title)}</span><span class="app-nav-description">${esc(item.description)}</span></span></${tag}>`;
  }
  function navigationColumns(groups, prefix) {
    return groups.map(group => `<section class="app-nav-group" aria-labelledby="${prefix}-${group.id}"><h2 id="${prefix}-${group.id}">${esc(group.title)}</h2><ul>${group.items.map(item => `<li>${navigationItem(item)}</li>`).join("")}</ul></section>`).join("");
  }
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
  window.AppUI = Object.freeze({ esc, icon, notice, options, showModal, hideModal, safeReturn, pages, user, registerUnsaved, navigationGroups, navigationColumns });
  if (file === "login.html") return;

  const nav = document.querySelector("body > nav");
  const headerGroups = navigationGroups.slice(0, 2);
  nav.className = "app-topbar";
  nav.innerHTML = `<div class="app-topbar-inner">
    <a href="./inicio.html" class="app-topbar-brand" aria-label="Início"><img src="./assets/ipb_logo.png" alt="IPB"></a>
    <div id="app-header-links" class="app-topbar-links">
      <a href="./inicio.html" class="app-topbar-link"${file === "inicio.html" ? ' aria-current="page"' : ""}>Início</a>
      ${headerGroups.map(group => `<button type="button" class="app-topbar-link" data-nav-toggle="${group.id}" aria-expanded="false" aria-controls="app-nav-${group.id}"${group.items.some(item => item.href === file) ? ' data-current="true"' : ""}>${esc(group.title)}${icon("down")}</button>`).join("")}
      <a href="./historico.html" class="app-topbar-link"${file === "historico.html" ? ' aria-current="page"' : ""}>Histórico</a>
      ${user.perfil === "coordenacao" ? `<a href="./coordenacao.html" class="app-topbar-link"${["coordenacao.html", "turma-form.html"].includes(file) ? ' aria-current="page"' : ""}>Gestão</a>` : ""}
    </div>
    <div class="app-topbar-account">
      <button type="button" id="user-menu-button" aria-expanded="false" aria-controls="user-dropdown" aria-haspopup="true" aria-label="Abrir opções de ${esc(user.nome)}" title="${esc(user.nome)}" class="app-topbar-profile"><span class="app-topbar-avatar" aria-hidden="true">${user.perfil === "professor" ? "MO" : "CP"}</span></button>
      <div id="user-dropdown" class="z-50 hidden w-64 rounded-base border border-default bg-neutral-primary">
        <div class="border-b border-default px-4 py-3"><p class="text-sm font-semibold text-heading">${esc(user.nome)}</p><p class="text-xs text-body-subtle">${user.perfil === "professor" ? "Professor" : "Coordenação"} · Demonstração</p></div>
        <ul class="space-y-1 p-2 text-sm"><li><button type="button" id="app-profile-info" data-app-action="profile" class="app-dropdown-item">${icon("users")}Meu perfil</button></li><li><button type="button" id="app-logout" data-app-action="logout" class="app-dropdown-item app-logout">${icon("logout")}Sair da conta</button></li></ul>
      </div>
    </div>
    <button type="button" id="app-mobile-menu" class="app-topbar-toggle" aria-expanded="false" aria-controls="app-header-links" aria-label="Abrir navegação">${icon("menu")}</button>
  </div>
  ${headerGroups.map(group => `<div id="app-nav-${group.id}" class="app-topbar-panel" hidden><div class="app-topbar-panel-inner">${navigationColumns([group], "header")}</div></div>`).join("")}`;
  const trigger = document.getElementById("user-menu-button");
  const menu = document.getElementById("user-dropdown");
  const dropdown = new Dropdown(menu, trigger, { placement: "bottom-end", onShow: () => trigger.setAttribute("aria-expanded", "true"), onHide: () => trigger.setAttribute("aria-expanded", "false") });
  trigger.addEventListener("keydown", event => { if (event.key === "ArrowDown") { event.preventDefault(); dropdown.show(); menu.querySelector("button").focus(); } });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && dropdown.isVisible()) { dropdown.hide(); trigger.focus(); } });
  const mobileToggle = document.getElementById("app-mobile-menu");
  const navToggles = [...nav.querySelectorAll("[data-nav-toggle]")];
  let activeNavToggle = null;
  function closeNavPanels(restoreFocus = false) {
    const previous = activeNavToggle;
    navToggles.forEach(button => {
      button.setAttribute("aria-expanded", "false");
      document.getElementById(button.getAttribute("aria-controls")).hidden = true;
    });
    activeNavToggle = null;
    if (restoreFocus) previous?.focus();
  }
  function setMobileMenu(open) {
    nav.dataset.mobileOpen = String(open);
    mobileToggle.setAttribute("aria-expanded", String(open));
    mobileToggle.setAttribute("aria-label", open ? "Fechar navegação" : "Abrir navegação");
    mobileToggle.innerHTML = icon(open ? "close" : "menu");
    if (!open) closeNavPanels();
  }
  function openNavPanel(button, focusFirst = false) {
    closeNavPanels();
    dropdown.hide();
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    activeNavToggle = button;
    if (focusFirst) panel.querySelector("a, button")?.focus();
  }
  navToggles.forEach(button => {
    button.addEventListener("click", () => activeNavToggle === button ? closeNavPanels() : openNavPanel(button));
    button.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); openNavPanel(button, true); }
    });
  });
  mobileToggle.addEventListener("click", () => { dropdown.hide(); setMobileMenu(nav.dataset.mobileOpen !== "true"); });
  trigger.addEventListener("click", () => setMobileMenu(false));
  document.addEventListener("click", event => { if (!nav.contains(event.target)) setMobileMenu(false); });
  nav.addEventListener("focusout", event => { if (event.relatedTarget && !nav.contains(event.relatedTarget)) setMobileMenu(false); });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (activeNavToggle) { closeNavPanels(true); return; }
    if (nav.dataset.mobileOpen === "true") { setMobileMenu(false); mobileToggle.focus(); }
  });
  matchMedia("(min-width: 48rem)").addEventListener("change", () => setMobileMenu(false));
  function logout() {
    if (pendingChanges.some(item => item.check())) {
      if (!window.confirm("Há alterações não salvas. Deseja descartá-las e sair?")) return;
      pendingChanges.forEach(item => item.clear());
    }
    D.logout(); location.href = "./login.html";
  }
  document.addEventListener("click", event => {
    const action = event.target.closest("[data-app-action]")?.dataset.appAction;
    if (!action) return;
    setMobileMenu(false);
    dropdown.hide();
    if (action === "logout") logout();
    if (action === "profile") showModal("Meu perfil", `<div class="space-y-4"><div class="app-icon-tile">${icon("users")}</div><h3 class="text-lg font-semibold text-heading">${esc(user.nome)}</h3><p>Perfil: ${user.perfil === "professor" ? "Professor" : "Coordenação pedagógica"}</p><p class="app-help">Conta demonstrativa. Os registros ficam neste navegador e não são enviados a um servidor.</p><a href="./turmas.html" class="app-btn app-btn-primary">Ver minhas turmas ${icon("arrow")}</a></div>`);
  });
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
