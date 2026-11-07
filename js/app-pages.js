"use strict";

(() => {
  const D = window.AppData, U = window.AppUI;
  if (!U) return;
  const { esc, icon, options, notice } = U;
  const page = document.body.dataset.page;
  const main = document.getElementById("page-content");
  const params = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);
  const typeNames = { regular: "Regular", revisao: "Revisão", PR1: "PR1", PR2: "PR2", PR3: "PR3" };
  const classOptions = (selected = "", all = false, placeholder = "Selecione a turma") => options(D.classes(all), selected, placeholder);
  const heading = (title, description, action = "") => `<header class="flex flex-wrap items-center justify-between gap-4"><div><h1 class="text-2xl font-semibold tracking-tight text-heading">${title}</h1><p class="mt-2 app-help">${description}</p></div>${action}</header><p id="app-feedback" hidden aria-live="polite"></p>`;
  const link = (href, label, name = "arrow", primary = false) => `<a href="${esc(href)}" class="app-btn ${primary ? "app-btn-primary" : "app-btn-secondary"}">${icon(name)}${label}</a>`;
  const empty = (title, description, action = "") => `<div class="app-empty"><span class="app-icon-tile">${icon("book")}</span><h3 class="font-semibold text-heading">${title}</h3><p class="max-w-md app-help">${description}</p>${action}</div>`;
  const field = (id, label, control) => `<div class="app-field"><label for="${id}">${label}</label>${control}</div>`;
  const select = (id, opts, attrs = "") => `<select id="${id}" name="${id}" class="app-input" ${attrs}>${opts}</select>`;
  const stat = (label, value, name, description) => `<div class="app-card app-card-body flex items-start justify-between gap-4"><div><p class="text-sm font-medium">${label}</p><p class="mt-3 text-3xl font-semibold tracking-tight text-heading">${value}</p><p class="mt-1 text-xs text-body-subtle">${description}</p></div><span class="app-icon-tile">${icon(name)}</span></div>`;
  const recordURL = (path, turmaId, date = "") => `./${path}?turma=${encodeURIComponent(turmaId)}${date ? `&data=${encodeURIComponent(date)}` : ""}`;
  function dataTable(caption, columns, rows, { minWidth = "30rem", modal = false, emptyLabel = "Nenhum registro encontrado." } = {}) {
    const cellClass = column => [column.identity ? "app-table-identity" : "", column.center ? "app-table-center" : ""].filter(Boolean).join(" ");
    return `<div class="app-table-region${modal ? " app-modal-table" : ""}" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="app-table" style="min-width:${minWidth}"><caption class="sr-only">${esc(caption)}</caption><colgroup>${columns.map(c => `<col${c.width ? ` style="width:${c.width}"` : ""}>`).join("")}</colgroup><thead><tr>${columns.map(c => `<th scope="col" class="${cellClass(c)}">${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map((content, i) => { const c = columns[i], tag = c.identity ? "th" : "td"; return `<${tag}${c.identity ? ' scope="row"' : ""} class="${cellClass(c)}">${content}</${tag}>`; }).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">${esc(emptyLabel)}</td></tr>`}</tbody></table></div>`;
  }
  function watchDirty(form) {
    let dirty = false;
    form.addEventListener("input", () => { dirty = true; });
    form.addEventListener("change", () => { dirty = true; });
    U.registerUnsaved(() => dirty, () => { dirty = false; });
    return () => { dirty = false; };
  }

  function login() {
    const form = $("login-form");
    const rememberKey = "ipb-login-username";
    const remember = $("remember-login");
    try { $("usuario").value = localStorage.getItem(rememberKey) || ""; } catch { /* Login still works without persistent storage. */ }
    remember.addEventListener("change", () => {
      if (!remember.checked) {
        try { localStorage.removeItem(rememberKey); } catch { /* Storage can be disabled. */ }
      }
    });
    form.addEventListener("input", () => notice("", false, $("login-error")));
    $("preencher-demo").addEventListener("click", () => {
      $("usuario").value = "professor";
      $("senha").value = "ipb123";
      notice("", false, $("login-error"));
      form.querySelector('[type="submit"]').focus();
    });
    const help = $("login-help");
    const helpMessages = {
      "forgot-password": ["Esqueceu a senha?", "A recuperação de senha ainda não está disponível. Use as credenciais de demonstração do APP 1 para entrar."],
      "google-login": ["Continuar com Google", "O acesso com Google ainda não está disponível. Entre com seu usuário e senha do APP 1."],
      "signup-login": ["Criar uma conta", "O cadastro ainda não está disponível. Use sua conta de demonstração do APP 1."]
    };
    Object.entries(helpMessages).forEach(([id, [title, description]]) => {
      $(id).addEventListener("click", () => {
        $("login-help-title").textContent = title;
        $("login-help-description").textContent = description;
        help.showModal();
      });
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      try {
        D.login($("usuario").value, $("senha").value);
        try {
          if (remember.checked) localStorage.setItem(rememberKey, $("usuario").value.trim());
          else localStorage.removeItem(rememberKey);
        } catch { /* Remembering the username is optional; never store the password. */ }
        location.href = U.safeReturn();
      }
      catch (error) { notice(error.message, true, $("login-error")); }
    });
  }

  function dashboard() {
    main.innerHTML = `<h1 class="sr-only">Navegação do APP 1</h1><nav class="app-home-grid" aria-label="Setores do aplicativo">${U.navigationColumns(U.navigationGroups, "home")}</nav>`;
  }

  function showRoster(id) {
    const t = D.getClass(id);
    if (!t) return;
    U.showModal(`Alunos · ${t.nome}`, `<p class="mb-4 app-help">${esc(D.course(t.cursoId)?.nome)} · ${D.roster(id).length} alunos matriculados</p>${dataTable(`Alunos da turma ${t.nome}`, [{ name: "Nº", width: "4rem", center: true }, { name: "Aluno", identity: true }, { name: "Situação", width: "10rem", center: true }], D.roster(id).map((a, i) => [String(i + 1).padStart(2, "0"), esc(a.nome), '<span class="app-badge app-badge-success">Matriculado</span>']), { minWidth: "30rem", modal: true })}<div class="mt-5 flex flex-wrap gap-3">${link(recordURL("registro-aula.html", id), "Registrar aula", "book")}${link(recordURL("presencas.html", id), "Frequ\u00eancia", "calendar", true)}${link(recordURL("avaliacao.html", id), "Avaliar alunos", "check")}</div>`);
  }

  function classesPage() {
    main.innerHTML = heading("Minhas turmas", U.user.perfil === "coordenacao" ? "Turmas ativas de todos os professores." : "Turmas vinculadas ao seu perfil.") +
      `<section class="app-card app-card-body grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,.7fr)]" aria-label="Filtrar turmas">${field("turma-busca", "Buscar turma", '<input type="search" id="turma-busca" class="app-input" placeholder="Nome da turma">')}${field("turma-curso", "Curso", select("turma-curso", options(D.courses, "", "Todos os cursos")))}</section><p id="turma-count" class="text-sm text-body-subtle" role="status"></p><ul id="turmas-lista" class="divide-y divide-default border-y border-default"></ul>`;
    function render() {
      const query = $("turma-busca").value.trim().toLocaleLowerCase();
      const filtered = D.classes().filter(t => t.nome.toLocaleLowerCase().includes(query) && (!$("turma-curso").value || t.cursoId === $("turma-curso").value));
      $("turma-count").textContent = `${filtered.length} ${filtered.length === 1 ? "turma encontrada" : "turmas encontradas"}`;
      $("turmas-lista").innerHTML = filtered.length ? filtered.map(t => `<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><h2 class="font-medium text-heading">${esc(t.nome)}</h2><p class="mt-1 text-sm text-body-subtle">${esc(D.course(t.cursoId)?.nome)} <span aria-hidden="true">·</span> ${esc(D.moduleFor(t.cursoId, t.moduloId)?.nome)}</p><p class="mt-1 text-sm text-body-subtle">${esc(D.schedule(t))}</p></div><button type="button" data-roster="${esc(t.id)}" class="app-btn app-btn-secondary shrink-0">${t.alunoIds.length} alunos ${icon("arrow")}</button></li>`).join("") : `<li>${empty("Nenhuma turma encontrada", "Tente outro nome ou selecione todos os cursos.")}</li>`;
      $("turmas-lista").querySelectorAll("[data-roster]").forEach(button => button.addEventListener("click", () => showRoster(button.dataset.roster)));
    }
    $("turma-busca").addEventListener("input", render);
    $("turma-curso").addEventListener("change", render);
    render();
  }

  function lessonPage() {
    let existing = params.get("id") ? D.lessons().find(a => a.id === params.get("id")) : null;
    if (params.has("id") && !existing) { main.innerHTML = heading("Registro não encontrado", "Este registro não está disponível para seu perfil.") + link("./historico.html", "Voltar ao histórico", "clock"); return; }
    if (existing && !D.getClass(existing.turmaId)?.ativa) { main.innerHTML = heading("Turma arquivada", "Os registros desta turma estão disponíveis para consulta no histórico.") + link("./historico.html", "Consultar histórico", "clock"); return; }
    const initial = existing?.turmaId || (D.classes().some(t => t.id === params.get("turma")) ? params.get("turma") : "");
    main.innerHTML = heading(existing ? "Editar registro de aula" : "Registro de aula", "Selecione a turma e marque o conteúdo trabalhado. Curso e módulo são preenchidos a partir da turma.", link("./historico.html?tipo=aula", "Consultar registros", "clock")) +
      `<form id="aula-form" class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="space-y-6"><section class="app-card app-card-body space-y-5" aria-labelledby="aula-info"><h2 id="aula-info" class="app-section-title">Informações da aula</h2><div class="grid gap-4 sm:grid-cols-2">${field("aula-turma", "Turma", select("aula-turma", classOptions(initial), "required"))}${field("aula-data", "Data da aula", `<input type="date" id="aula-data" class="app-input" value="${esc(existing?.data || D.today())}" max="${D.today()}" required>`)}${field("aula-curso", "Curso", select("aula-curso", options(D.courses), "required disabled"))}${field("aula-modulo", "Módulo", select("aula-modulo", options([]), "required disabled"))}</div><fieldset><legend class="mb-3 text-sm font-medium text-heading">Tipo de aula</legend><div class="grid grid-cols-2 gap-2 sm:grid-cols-5">${Object.entries(typeNames).map(([value, name]) => `<label class="app-choice items-center p-3"><input type="radio" name="tipo" value="${value}" ${(existing?.tipo || "regular") === value ? "checked" : ""} class="accent-gray-900"><span>${name}</span></label>`).join("")}</div></fieldset></section>
        <section class="app-card app-card-body space-y-4" aria-labelledby="licoes-title"><div class="flex flex-wrap items-center justify-between gap-3"><h2 id="licoes-title" class="app-section-title">Lições ministradas</h2><span id="licoes-count" class="app-badge" role="status">0 selecionadas</span></div><p class="app-help">Marque uma ou mais lições trabalhadas nesta aula.</p><div id="aula-licoes" class="grid gap-3 sm:grid-cols-2"></div></section>
        <section class="app-card app-card-body">${field("aula-notas", 'Observações <span class="font-normal text-body-subtle">(opcional)</span>', `<textarea id="aula-notas" rows="3" maxlength="600" class="app-input" placeholder="Algum contexto importante sobre a aula?">${esc(existing?.notas || "")}</textarea>`)}</section></div>
        <aside class="app-card app-card-body space-y-5" aria-labelledby="resumo-aula-title"><div class="flex items-center gap-3"><span class="app-icon-tile">${icon("book")}</span><h2 id="resumo-aula-title" class="app-section-title">Resumo do registro</h2></div><div id="aula-resumo" class="space-y-4 text-sm"></div><p id="aula-error" hidden role="alert"></p><button type="submit" id="salvar-aula" class="app-btn app-btn-primary w-full">${icon("save")}<span>${existing ? "Salvar alterações" : "Salvar registro"}</span></button><p class="text-xs leading-relaxed text-body-subtle">O registro salvo ficará disponível no histórico da turma.</p><div id="aula-proximos" hidden class="space-y-3 border-t border-default pt-4"></div></aside>
      </form>`;
    const form = $("aula-form");
    const clean = watchDirty(form);
    const checkedLessons = () => [...form.querySelectorAll('[name="licao"]:checked')].map(input => input.value);
    function summary() {
      const turma = D.getClass($("aula-turma").value);
      const lessons = checkedLessons();
      $("licoes-count").textContent = `${lessons.length} selecionada${lessons.length === 1 ? "" : "s"}`;
      $("aula-resumo").innerHTML = `<div><p class="text-xs text-body-subtle">Turma</p><p class="mt-1 font-semibold text-heading">${esc(turma?.nome || "Selecione uma turma")}</p></div><div><p class="text-xs text-body-subtle">Data e tipo</p><p class="mt-1 text-heading">${D.formatDate($("aula-data").value)} · ${typeNames[form.elements.tipo.value]}</p></div><div><p class="text-xs text-body-subtle">Conteúdo</p><p class="mt-1 text-heading">${lessons.length ? lessons.map(esc).join("<br>") : "Nenhuma lição selecionada"}</p></div>`;
      $("salvar-aula").disabled = !turma;
    }
    function renderLessons(selected = []) {
      const module = D.moduleFor($("aula-curso").value, $("aula-modulo").value);
      $("aula-licoes").innerHTML = module ? module.licoes.map((lesson, i) => `<label class="app-choice"><input type="checkbox" name="licao" value="${esc(lesson)}" ${selected.includes(lesson) ? "checked" : ""} class="mt-0.5 accent-gray-900"><span><span class="block text-xs text-body-subtle">Lição ${String(i + 1).padStart(2, "0")}</span><span class="mt-1 block font-medium text-heading">${esc(lesson)}</span></span></label>`).join("") : '<p class="app-help sm:col-span-2 py-6">Selecione uma turma, um curso e um módulo para ver as lições.</p>';
      summary();
    }
    function fillModules(selected = "", lessons = []) {
      const course = D.course($("aula-curso").value);
      $("aula-modulo").innerHTML = options(course?.modulos || [], selected);
      $("aula-modulo").disabled = !course;
      renderLessons(lessons);
    }
    function fillClass(isInitial = false) {
      const turma = D.getClass($("aula-turma").value);
      $("aula-curso").disabled = !turma;
      $("aula-curso").value = isInitial && existing ? existing.cursoId : turma?.cursoId || "";
      fillModules(isInitial && existing ? existing.moduloId : turma?.moduloId, isInitial && existing ? existing.licoes : []);
    }
    $("aula-turma").addEventListener("change", () => fillClass());
    $("aula-curso").addEventListener("change", () => fillModules());
    $("aula-modulo").addEventListener("change", () => renderLessons());
    form.addEventListener("change", () => { summary(); $("aula-proximos").hidden = true; notice(""); notice("", false, $("aula-error")); });
    form.addEventListener("submit", event => {
      event.preventDefault();
      try {
        existing = D.saveLesson({ id: existing?.id, turmaId: $("aula-turma").value, data: $("aula-data").value, cursoId: $("aula-curso").value, moduloId: $("aula-modulo").value, tipo: form.elements.tipo.value, licoes: checkedLessons(), notas: $("aula-notas").value.trim() });
        clean(); notice("Aula salva. O registro já está disponível no histórico."); notice("", false, $("aula-error"));
        $("salvar-aula").querySelector("span").textContent = "Salvar alterações";
        history.replaceState(null, "", `./registro-aula.html?id=${encodeURIComponent(existing.id)}`);
        $("aula-proximos").hidden = false;
        $("aula-proximos").innerHTML = `<p class="text-sm font-semibold text-heading">Continue o acompanhamento</p>${link(recordURL("presencas.html", existing.turmaId, existing.data), "Registrar frequência", "calendar")}${link("./registro-aula.html", "Nova aula", "plus")}`;
      } catch (error) { notice(error.message, true, $("aula-error")); }
    });
    fillClass(true);
    if (!D.classes().length) notice("Nenhuma turma ativa disponível. A coordenação pode cadastrar ou reativar uma turma.", true);
  }

  function showRecord(record) {
    const turma = D.getClass(record.turmaId);
    if (!turma) return;
    let body = `<p class="mb-5 app-help">${esc(turma.nome)} · ${D.formatDate(record.data)}</p>`;
    if (record.tipo === "aula") {
      const a = record.registro;
      body += `<dl class="mb-5 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs text-body-subtle">Curso</dt><dd class="mt-1 font-medium text-heading">${esc(D.course(a.cursoId)?.nome)}</dd></div><div><dt class="text-xs text-body-subtle">Módulo</dt><dd class="mt-1 text-heading">${esc(D.moduleFor(a.cursoId, a.moduloId)?.nome)}</dd></div><div><dt class="text-xs text-body-subtle">Tipo de aula</dt><dd class="mt-1"><span class="app-badge">${esc(typeNames[a.tipo])}</span></dd></div></dl><h3 class="mb-3 font-semibold text-heading">Conteúdos registrados</h3><ul class="space-y-2">${a.licoes.map(l => `<li class="flex gap-2 rounded-base border border-default p-3 text-sm">${icon("check")}${esc(l)}</li>`).join("")}</ul>${a.notas ? `<h3 class="mb-2 mt-5 font-semibold text-heading">Observações</h3><p class="whitespace-pre-wrap break-words text-sm">${esc(a.notas)}</p>` : ""}${turma.ativa ? `<div class="mt-6">${link(`./registro-aula.html?id=${encodeURIComponent(a.id)}`, "Editar registro", "edit", true)}</div>` : ""}`;
    } else if (record.tipo === "frequencia") {
      const studentIds = new Set([...turma.alunoIds, ...Object.keys(record.registro)]);
      body += dataTable(`Frequência de ${turma.nome} em ${D.formatDate(record.data)}`, [{ name: "Aluno", identity: true }, { name: "Frequência", width: "10rem", center: true }], D.students.filter(a => studentIds.has(a.id)).map(a => [esc(a.nome), `<span class="app-badge ${record.registro[a.id] === "presente" ? "app-badge-success" : record.registro[a.id] === "falta" ? "app-badge-danger" : ""}">${({ presente: "Presente", falta: "Falta" })[record.registro[a.id]] || "Sem registro"}</span>`]), { minWidth: "24rem", modal: true }) + (turma.ativa ? `<div class="mt-5">${link(recordURL("presencas.html", turma.id, record.data), "Abrir frequência", "calendar", true)}</div>` : "");
    } else {
      body += `<p class="mb-4 text-sm">${esc(record.resumo)}</p>${dataTable(`Avaliação de ${turma.nome} em ${D.formatDate(record.data)}`, [{ name: "Aluno", width: "14rem", identity: true }, { name: "Critério" }, { name: "Resultado", width: "9rem", center: true }], record.registro.alunos.flatMap(a => D.criteria.filter(c => a.avaliacoes[c.id]).map(c => [esc(a.nome), esc(c.nome), `<span class="app-badge ${a.avaliacoes[c.id] === "ok" ? "app-badge-success" : "app-badge-danger"}">${a.avaliacoes[c.id] === "ok" ? "OK" : "Não OK"}</span>`])), { minWidth: "42rem", modal: true, emptyLabel: "Nenhum critério marcado nesta avaliação." })}<p class="mt-3 app-help">Critérios não listados permanecem sem status.</p>${turma.ativa ? `<div class="mt-5">${link(recordURL("avaliacao.html", turma.id, record.data), "Abrir avaliação", "check", true)}</div>` : ""}`;
    }
    U.showModal(record.titulo, body);
  }
  function bindRecordDetails(records) { main.querySelectorAll("[data-record]").forEach(button => button.addEventListener("click", () => { const item = records.find(r => r.id === button.dataset.record); if (item) showRecord(item); })); }

  function historyPage() {
    main.innerHTML = heading("Histórico", "Consulte aulas, frequência, avaliações e os conteúdos registrados para cada turma.") +
      `<form id="historico-filtros" class="app-card app-card-body space-y-4"><div class="app-history-filters">${field("historico-turma", "Turma", select("historico-turma", classOptions(params.get("turma"), true, "Todas as turmas")))}${field("historico-tipo", "Tipo de registro", select("historico-tipo", options([{ id: "aula", nome: "Aulas e conteúdos" }, { id: "frequencia", nome: "Frequências" }, { id: "avaliacao", nome: "Avaliações observacionais" }], params.get("tipo"), "Todos os registros")))}${field("historico-inicio", "Data inicial", '<input type="date" id="historico-inicio" class="app-input">')}${field("historico-fim", "Data final", '<input type="date" id="historico-fim" class="app-input">')}<div class="app-filter-actions"><button type="submit" class="app-btn app-btn-primary">${icon("search")}Buscar</button><button type="reset" class="app-btn app-btn-secondary">Limpar filtros</button></div></div><div class="app-history-content">${field("historico-conteudo", "Conteúdo ou observação", '<input type="search" id="historico-conteudo" class="app-input" placeholder="Buscar nas lições e observações">')}</div></form>
      <section class="app-card overflow-hidden" aria-labelledby="historico-resultados"><div class="app-table-heading"><h2 id="historico-resultados" class="app-section-title">Registros encontrados</h2><p id="historico-count" class="text-sm text-body-subtle" role="status"></p></div><div id="historico-lista"></div><div id="historico-paginacao" class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-4 py-3"><button id="historico-anterior" type="button" class="app-btn app-btn-secondary">Anterior</button><p id="historico-pagina" class="text-sm" role="status"></p><button id="historico-proximo" type="button" class="app-btn app-btn-secondary">Próxima</button></div></section>`;
    let results = [], current = 1;
    function render() {
      $("historico-count").textContent = `${results.length} registro${results.length === 1 ? "" : "s"}`;
      const pages = Math.max(1, Math.ceil(results.length / 10));
      const visible = results.slice((current - 1) * 10, current * 10);
      $("historico-lista").innerHTML = visible.length ? dataTable("Histórico de registros pedagógicos", [{ name: "Data", width: "8rem", identity: true }, { name: "Turma", width: "10rem" }, { name: "Registro", width: "15rem" }, { name: "Conteúdo / resumo" }, { name: "Ações", width: "11rem", center: true }], visible.map(r => [`<span class="whitespace-nowrap">${D.formatDate(r.data)}</span>`, esc(D.getClass(r.turmaId)?.nome), `<span class="app-badge">${r.titulo}</span>`, esc(r.resumo), `<button type="button" class="app-btn app-btn-secondary whitespace-nowrap" data-record="${esc(r.id)}" aria-label="Ver ${esc(r.titulo)} de ${esc(D.getClass(r.turmaId)?.nome)} em ${D.formatDate(r.data)}">Ver detalhes ${icon("arrow")}</button>`]), { minWidth: "62rem" }) : empty("Nenhum registro encontrado", "Ajuste os filtros ou registre uma aula, frequência ou avaliação.", link("./registro-aula.html", "Registrar aula", "plus", true));
      $("historico-paginacao").hidden = results.length <= 10;
      $("historico-pagina").textContent = `Página ${current} de ${pages}`;
      $("historico-anterior").disabled = current === 1;
      $("historico-proximo").disabled = current === pages;
      bindRecordDetails(results);
    }
    function search() {
      const start = $("historico-inicio").value, end = $("historico-fim").value;
      if (start && end && start > end) { notice("A data final deve ser igual ou posterior à data inicial.", true); return; }
      notice("");
      const query = $("historico-conteudo").value.trim().toLocaleLowerCase();
      results = D.history().filter(r => (!$("historico-turma").value || r.turmaId === $("historico-turma").value) && (!$("historico-tipo").value || r.tipo === $("historico-tipo").value) && (!start || r.data >= start) && (!end || r.data <= end) && (!query || `${r.resumo} ${r.registro.notas || ""}`.toLocaleLowerCase().includes(query)));
      current = 1; render();
    }
    $("historico-filtros").addEventListener("submit", event => { event.preventDefault(); search(); });
    $("historico-filtros").addEventListener("reset", event => { event.preventDefault(); ["historico-turma", "historico-tipo", "historico-inicio", "historico-fim", "historico-conteudo"].forEach(id => { $(id).value = ""; }); search(); });
    $("historico-anterior").addEventListener("click", () => { current--; render(); });
    $("historico-proximo").addEventListener("click", () => { current++; render(); });
    search();
  }

  function coordination() {
    if (U.user.perfil !== "coordenacao") return;
    main.innerHTML = heading("Coordena\u00e7\u00e3o pedag\u00f3gica", "Gerencie turmas e consulte os registros.", `<a href="./turma-form.html" class="app-btn app-btn-primary">${icon("plus")}Nova turma</a>`) +
      `<section class="app-card app-card-body grid gap-4 sm:grid-cols-3" aria-label="Filtrar turmas">${field("coord-busca", "Buscar turma", '<input type="search" id="coord-busca" class="app-input" placeholder="Nome da turma">')}${field("coord-professor", "Professor", select("coord-professor", options(D.teachers, "", "Todos os professores")))}${field("coord-status", "Situa\u00e7\u00e3o", select("coord-status", '<option value="ativas">Ativas</option><option value="arquivadas">Arquivadas</option><option value="todas">Todas</option>'))}</section><section class="app-card overflow-hidden" aria-labelledby="coord-turmas"><div class="app-table-heading"><h2 id="coord-turmas" class="app-section-title">Turmas cadastradas</h2>${link("./historico.html", "Ver registros", "clock")}</div><div id="coord-lista"></div><p id="coord-count" class="border-t border-default px-4 py-3 text-sm text-body-subtle" role="status"></p></section>`;
    function render() {
      const all = D.classes(true);
      const filtered = all.filter(t => t.nome.toLocaleLowerCase().includes($("coord-busca").value.trim().toLocaleLowerCase()) && (!$("coord-professor").value || t.professorId === $("coord-professor").value) && ($("coord-status").value === "todas" || t.ativa === ($("coord-status").value === "ativas")));
      $("coord-count").textContent = `${filtered.length} turma${filtered.length === 1 ? "" : "s"}`;
      $("coord-lista").innerHTML = filtered.length ? dataTable("Turmas cadastradas", [{ name: "Turma / curso", identity: true }, { name: "Professor / hor\u00e1rio", width: "17rem" }, { name: "Alunos", width: "6rem", center: true }, { name: "Situa\u00e7\u00e3o", width: "9rem", center: true }, { name: "A\u00e7\u00f5es", width: "17rem", center: true }], filtered.map(t => [`<p class="font-semibold text-heading">${esc(t.nome)}</p><p class="mt-1 text-xs">${esc(D.course(t.cursoId)?.nome)}</p><p class="mt-1 text-xs text-body-subtle">${esc(D.moduleFor(t.cursoId, t.moduloId)?.nome)}</p>`, `<p class="text-heading">${esc(D.teachers.find(p => p.id === t.professorId)?.nome)}</p><p class="mt-1 whitespace-nowrap text-xs text-body-subtle">${esc(D.schedule(t))}</p>`, t.alunoIds.length, `<span class="app-badge ${t.ativa ? "app-badge-success" : ""}">${t.ativa ? "Ativa" : "Arquivada"}</span>`, `<div class="flex justify-center gap-2"><a href="./turma-form.html?turma=${encodeURIComponent(t.id)}" class="app-btn app-btn-secondary">Editar</a>${link(recordURL("historico.html", t.id), "Registros", "clock")}</div>`]), { minWidth: "65rem" }) : empty("Nenhuma turma encontrada", "Ajuste os filtros ou cadastre uma nova turma.");
    }
    ["coord-busca", "coord-professor", "coord-status"].forEach(id => $(id).addEventListener(id === "coord-busca" ? "input" : "change", render));
    render();
  }

  function classForm() {
    if (U.user.perfil !== "coordenacao") return;
    const turmaId = params.get("turma");
    const turma = turmaId ? D.getClass(turmaId) : null;
    if (turmaId && !turma) {
      main.innerHTML = heading("Turma n\u00e3o encontrada", "Confira a lista de turmas e tente novamente.") + link("./coordenacao.html", "Voltar \u00e0s turmas", "arrow");
      return;
    }
    const courseId = turma?.cursoId || "";
    main.innerHTML = heading(turma ? "Editar turma" : "Nova turma", "Preencha os dados da turma.", link("./coordenacao.html", "Voltar \u00e0s turmas", "arrow")) +
      `<form id="turma-form" class="app-card app-card-body space-y-5"><div class="grid gap-4 sm:grid-cols-2">${field("gestao-nome", "Nome da turma", `<input id="gestao-nome" class="app-input" value="${esc(turma?.nome || "")}" maxlength="60" placeholder="Ex.: 8\u00ba ano A" required>`)}${field("gestao-professor", "Professor respons\u00e1vel", select("gestao-professor", options(D.teachers, turma?.professorId), "required"))}${field("gestao-curso", "Curso", select("gestao-curso", options(D.courses, courseId), "required"))}${field("gestao-modulo", "M\u00f3dulo", select("gestao-modulo", options(D.course(courseId)?.modulos || [], turma?.moduloId), `required ${courseId ? "" : "disabled"}`))}</div><fieldset><legend class="mb-3 text-sm font-medium text-heading">Dias da semana</legend><div class="flex flex-wrap gap-2">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\u00e1b"].map((name, i) => `<label class="app-choice items-center p-2.5"><input type="checkbox" name="dia" value="${i}" ${turma?.dias.includes(i) ? "checked" : ""}>${name}</label>`).join("")}</div></fieldset><div class="grid grid-cols-2 gap-4">${field("gestao-inicio", "In\u00edcio", `<input type="time" id="gestao-inicio" class="app-input" value="${esc(turma?.inicio || "08:00")}" required>`)}${field("gestao-fim", "T\u00e9rmino", `<input type="time" id="gestao-fim" class="app-input" value="${esc(turma?.fim || "08:50")}" required>`)}</div><fieldset><legend class="mb-2 text-sm font-medium text-heading">Alunos da turma</legend><div class="mb-3 flex flex-wrap items-center justify-between gap-2"><p class="app-help">Selecione os alunos matriculados.</p><button type="button" id="gestao-todos" class="cursor-pointer text-sm font-semibold underline underline-offset-4">Selecionar todos</button></div><ul class="divide-y divide-default border-y border-default">${D.students.map(a => `<li><label class="flex cursor-pointer items-center gap-3 py-2.5 text-sm"><input type="checkbox" name="aluno" value="${a.id}" ${turma?.alunoIds.includes(a.id) ? "checked" : ""}>${esc(a.nome)}</label></li>`).join("")}</ul><p id="gestao-alunos-count" role="status" class="mt-2 app-help"></p></fieldset>${turma ? `<label class="app-choice"><input type="checkbox" id="gestao-ativa" ${turma.ativa ? "checked" : ""}><span><span class="block font-medium text-heading">Turma ativa</span><span class="mt-1 block app-help">Desmarque para arquivar. Os registros existentes continuam no hist\u00f3rico.</span></span></label>` : ""}<p id="gestao-error" hidden role="alert"></p><div class="flex flex-wrap justify-end gap-3 border-t border-default pt-5"><a href="./coordenacao.html" class="app-btn app-btn-secondary">Cancelar</a><button type="submit" class="app-btn app-btn-primary">${icon("save")}Salvar turma</button></div></form>`;
    const form = $("turma-form");
    const selectedStudents = () => [...form.querySelectorAll('[name="aluno"]:checked')].map(input => input.value);
    const updateCount = () => { $("gestao-alunos-count").textContent = `${selectedStudents().length} alunos selecionados`; $("gestao-todos").textContent = selectedStudents().length === D.students.length ? "Limpar sele\u00e7\u00e3o" : "Selecionar todos"; };
    $("gestao-curso").addEventListener("change", () => { const c = D.course($("gestao-curso").value); $("gestao-modulo").innerHTML = options(c?.modulos || []); $("gestao-modulo").disabled = !c; });
    $("gestao-todos").addEventListener("click", () => { const value = selectedStudents().length !== D.students.length; form.querySelectorAll('[name="aluno"]').forEach(input => { input.checked = value; }); updateCount(); });
    form.addEventListener("change", updateCount);
    form.addEventListener("submit", event => {
      event.preventDefault();
      try {
        D.saveClass({ id: turma?.id, nome: $("gestao-nome").value, professorId: $("gestao-professor").value, cursoId: $("gestao-curso").value, moduloId: $("gestao-modulo").value, dias: [...form.querySelectorAll('[name="dia"]:checked')].map(i => Number(i.value)), inicio: $("gestao-inicio").value, fim: $("gestao-fim").value, alunoIds: selectedStudents(), ativa: turma ? $("gestao-ativa").checked : true });
        location.href = "./coordenacao.html";
      } catch (error) { notice(error.message, true, $("gestao-error")); $("gestao-error").scrollIntoView({ block: "nearest" }); }
    });
    updateCount();
  }

  const screens = { login, inicio: dashboard, turmas: classesPage, registro: lessonPage, historico: historyPage, coordenacao: coordination, "turma-form": classForm };
  screens[page]?.();
  if (D.hasStorageError()) notice("Alguns dados locais não puderam ser lidos. Verifique o armazenamento do navegador antes de salvar novos registros.", true);
})();
