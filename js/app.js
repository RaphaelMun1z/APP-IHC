"use strict";

(() => {
	if (!window.AppUI?.user) return;
	const criterios = AppData.criteria;

	// Dados fictícios locais: os IDs permanecem estáveis entre renderizações.
	const alunos = AppData.students.map((aluno) => ({
		...aluno,
		avaliacoes: Object.fromEntries(criterios.map(({ id }) => [id, null])),
	}));

	const icones = {
		pendente: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
		ok: '<path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.47 22H3a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h2.76a2 2 0 0 0 1.79-1.11L11 2a3.13 3.13 0 0 1 4 3.9Z"/>',
		"nao-ok": '<path d="M17 14V2M9 18.1 10 14H4.2a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.53 2H21a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-2.76a2 2 0 0 0-1.79 1.11L13 22a3.13 3.13 0 0 1-4-3.9Z"/>',
	};
	const rotulos = { pendente: "Sem status", ok: "OK", "nao-ok": "Não OK" };
	const selecionados = new Set();
	const criteriosSelecionados = new Set();
	const linhas = new Map();
	const alunosPorId = new Map(alunos.map((aluno) => [aluno.id, aluno]));
	const criteriosPorId = new Map(criterios.map((criterio) => [criterio.id, criterio]));
	const corpoTabela = document.getElementById("alunos");
	const selecionarTodos = document.getElementById("selecionar-todos");
	const limparSelecao = document.getElementById("limpar-selecao");
	const resumoSelecao = document.getElementById("selecao-resumo");
	const turmaControle = document.getElementById("avaliacao-turma");
	const dataControle = document.getElementById("avaliacao-data");
	const feedback = document.getElementById("avaliacao-feedback");
	const parametros = new URLSearchParams(location.search);
	turmaControle.innerHTML = AppUI.options(AppData.classes(), parametros.get("turma"), "Selecione a turma");
	if (!turmaControle.value) turmaControle.value = AppData.classes()[0]?.id || "";
	const dataSolicitada = parametros.get("data");
	dataControle.value = /^\d{4}-\d{2}-\d{2}$/.test(dataSolicitada || "") && dataSolicitada <= AppData.today() ? dataSolicitada : AppData.today();
	dataControle.max = AppData.today();
	let turmaAtual = turmaControle.value;
	let dataAtual = dataControle.value;
	let alterado = false;
	const alunosDaTurma = () => alunos.filter(a => AppData.getClass(turmaAtual)?.alunoIds.includes(a.id));

	function icone(status) {
		return `<svg class="status-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icones[status]}</svg>`;
	}

	function atualizarCelula(botao, aluno, criterio) {
		const status = aluno.avaliacoes[criterio.id] ?? "pendente";
		const proximos = { pendente: "OK", ok: "Não OK", "nao-ok": "sem status" };
		botao.dataset.status = status;
		botao.innerHTML = icone(status);
		const descricao = `${aluno.nome} — ${criterio.nome}: ${rotulos[status]}. Próximo status: ${proximos[status]}.`;
		botao.setAttribute("aria-label", descricao);
		botao.title = descricao;
	}

	function copiarAluno(aluno) {
		return { id: aluno.id, nome: aluno.nome, avaliacoes: { ...aluno.avaliacoes } };
	}

	function obterSelecionados() {
		return alunosDaTurma().filter(({ id }) => selecionados.has(id)).map(copiarAluno);
	}

	function atualizarSelecao() {
		for (const aluno of alunos) {
			const selecionado = selecionados.has(aluno.id);
			const { linha, checkbox } = linhas.get(aluno.id);
			linha.dataset.selected = String(selecionado);
			checkbox.checked = selecionado;
			const nome = linha.querySelector(".student-cell");
			nome.setAttribute("aria-pressed", String(selecionado));
		}
		const quantidade = selecionados.size;
		const total = alunosDaTurma().length;
		selecionarTodos.checked = total > 0 && quantidade === total;
		selecionarTodos.indeterminate = quantidade > 0 && quantidade < total;
		selecionarTodos.disabled = total === 0;
		limparSelecao.disabled = quantidade === 0;
		resumoSelecao.textContent = `${quantidade} de ${total} alunos selecionados`;
		resumoSelecao.classList.toggle("text-fg-brand", quantidade > 0);
		resumoSelecao.classList.toggle("text-body", quantidade === 0);

		// As futuras ações em lote podem escutar este evento.
		document.dispatchEvent(new CustomEvent("avaliacao:selecao-alterada", {
			detail: { ids: [...selecionados], alunos: obterSelecionados() },
		}));
	}

	const legenda = document.getElementById("legenda-status");
	for (const [status, rotulo] of Object.entries(rotulos)) {
		const item = document.createElement("li");
		item.className = "status-legend";
		item.dataset.status = status;
		item.innerHTML = icone(status);
		item.append(document.createTextNode(rotulo));
		legenda.append(item);
	}

	const cabecalho = document.getElementById("cabecalho-criterios");
	for (const criterio of criterios) {
		const coluna = document.createElement("th");
		coluna.id = `criterio-${criterio.id}`;
		coluna.scope = "col";
		coluna.className = "criterion-heading font-semibold";
		coluna.setAttribute("aria-label", criterio.nome);
		coluna.tabIndex = 0;
		coluna.setAttribute("aria-pressed", "false");
		const seletor = document.createElement("label");
		seletor.className = "criterion-select";
		const checkboxCriterio = document.createElement("input");
		checkboxCriterio.type = "checkbox";
		checkboxCriterio.className = "student-checkbox";
		checkboxCriterio.dataset.criterionSelect = criterio.id;
		checkboxCriterio.setAttribute("aria-label", `Selecionar critério ${criterio.nome}`);
		seletor.append(checkboxCriterio);
		const titulo = document.createElement("span");
		titulo.className = "criterion-title";
		for (const palavra of criterio.nome.split(/\s+/)) {
			const colunaPalavra = document.createElement("span");
			colunaPalavra.className = "criterion-word";
			colunaPalavra.textContent = palavra;
			titulo.append(colunaPalavra);
		}
		coluna.append(seletor, titulo);
		cabecalho.append(coluna);
	}

	const fragmento = document.createDocumentFragment();
	for (const aluno of alunos) {
		const linha = document.createElement("tr");
		linha.className = "evaluation-row";
		linha.dataset.studentId = aluno.id;
		linha.dataset.selected = "false";

		const celulaSelecao = document.createElement("td");
		celulaSelecao.className = "selection-cell";
		const label = document.createElement("label");
		label.className = "selection-label";
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = `selecionar-${aluno.id}`;
		checkbox.className = "student-checkbox";
		checkbox.dataset.selectStudent = aluno.id;
		checkbox.setAttribute("aria-label", `Selecionar ${aluno.nome}`);
		label.append(checkbox);
		celulaSelecao.append(label);

		const nome = document.createElement("th");
		nome.id = aluno.id;
		nome.scope = "row";
		nome.className = "student-cell px-4 py-3 font-medium text-heading";
		nome.textContent = aluno.nome;
		nome.tabIndex = 0;
		nome.setAttribute("aria-label", `Selecionar aluno ${aluno.nome}`);
		nome.setAttribute("aria-pressed", "false");
		linha.append(celulaSelecao, nome);

		for (const criterio of criterios) {
			const celula = document.createElement("td");
			celula.className = "status-cell";
			const botao = document.createElement("button");
			botao.type = "button";
			botao.className = "status-button";
			botao.dataset.studentId = aluno.id;
			botao.dataset.criterionId = criterio.id;
			atualizarCelula(botao, aluno, criterio);
			celula.append(botao);
			linha.append(celula);
		}
		linhas.set(aluno.id, { linha, checkbox });
		fragmento.append(linha);
	}
	corpoTabela.append(fragmento);

	let colunaEmDestaque = null;
	let alunoEmDestaque = null;
	function limparDestaqueHover() {
		if (alunoEmDestaque) alunoEmDestaque.dataset.hovered = "false";
		if (colunaEmDestaque) {
			for (const celula of corpoTabela.querySelectorAll(`[data-criterion-id="${colunaEmDestaque}"]`)) {
				celula.parentElement.dataset.columnHovered = "false";
			}
			const cabecalho = document.getElementById(`criterio-${colunaEmDestaque}`);
			if (cabecalho) cabecalho.dataset.columnHovered = "false";
		}
		alunoEmDestaque = null;
		colunaEmDestaque = null;
		corpoTabela.closest(".evaluation-table").dataset.hoverActive = "false";
		cabecalho.dataset.hoverActive = "false";
		document.dispatchEvent(new CustomEvent("avaliacao:hover-coluna-alterada", { detail: { criterioId: null } }));
	}
	corpoTabela.addEventListener("pointerover", (event) => {
		const linha = event.target.closest("tr.evaluation-row");
		if (!linha) return;
		const botao = event.target.closest("[data-criterion-id]");
		const novoCriterio = botao?.dataset.criterionId ?? null;
		if (alunoEmDestaque === linha && colunaEmDestaque === novoCriterio) return;
		limparDestaqueHover();
		alunoEmDestaque = linha;
		linha.dataset.hovered = "true";
		colunaEmDestaque = novoCriterio;
		const tabela = corpoTabela.closest(".evaluation-table");
		tabela.dataset.hoverActive = "true";
		cabecalho.dataset.hoverActive = "true";
		if (novoCriterio) {
			for (const celula of corpoTabela.querySelectorAll(`[data-criterion-id="${novoCriterio}"]`)) {
				celula.parentElement.dataset.columnHovered = "true";
			}
			const cabecalho = document.getElementById(`criterio-${novoCriterio}`);
			if (cabecalho) cabecalho.dataset.columnHovered = "true";
		}
		document.dispatchEvent(new CustomEvent("avaliacao:hover-coluna-alterada", { detail: { criterioId: novoCriterio } }));
	});
	corpoTabela.addEventListener("pointerout", (event) => {
		if (!corpoTabela.contains(event.relatedTarget)) limparDestaqueHover();
	});

	function atualizarSelecaoCriterios() {
		for (const criterio of criterios) {
			const selecionado = criteriosSelecionados.has(criterio.id);
			const cabecalho = document.getElementById(`criterio-${criterio.id}`);
			cabecalho.dataset.criterionSelected = String(selecionado);
			cabecalho.setAttribute("aria-pressed", String(selecionado));
			cabecalho.querySelector("[data-criterion-select]").checked = selecionado;
			for (const { linha } of linhas.values()) {
				const celula = linha.querySelector(`[data-criterion-id="${criterio.id}"]`).parentElement;
				celula.dataset.criterionSelected = String(selecionado);
			}
		}
		document.dispatchEvent(new CustomEvent("avaliacao:criterios-selecionados-alterada", {
			detail: { ids: [...criteriosSelecionados], criterios: criterios.filter(({ id }) => criteriosSelecionados.has(id)) },
		}));
	}

	function alternarCriterio(checkbox) {
		checkbox.checked = !checkbox.checked;
		checkbox.dispatchEvent(new Event("change", { bubbles: true }));
	}

	cabecalho.addEventListener("click", (event) => {
		const celula = event.target.closest("th.criterion-heading");
		if (!celula || event.target.closest("input, label")) return;
		alternarCriterio(celula.querySelector("[data-criterion-select]"));
	});

	cabecalho.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		const celula = event.target.closest("th.criterion-heading");
		if (!celula || event.target !== celula) return;
		event.preventDefault();
		alternarCriterio(celula.querySelector("[data-criterion-select]"));
	});

	cabecalho.addEventListener("change", (event) => {
		const checkbox = event.target.closest("[data-criterion-select]");
		if (!checkbox) return;
		if (checkbox.checked) criteriosSelecionados.add(checkbox.dataset.criterionSelect);
		else criteriosSelecionados.delete(checkbox.dataset.criterionSelect);
		atualizarSelecaoCriterios();
	});

	corpoTabela.addEventListener("click", (event) => {
		const nome = event.target.closest(".student-cell");
		if (nome) {
			const id = nome.closest("tr").dataset.studentId;
			if (selecionados.has(id)) selecionados.delete(id);
			else selecionados.add(id);
			atualizarSelecao();
			return;
		}
		const botao = event.target.closest(".status-button");
		if (!botao) return;
		const aluno = alunosPorId.get(botao.dataset.studentId);
		const criterio = criteriosPorId.get(botao.dataset.criterionId);
		const statusAtual = aluno.avaliacoes[criterio.id];
		aluno.avaliacoes[criterio.id] = statusAtual === "ok" ? "nao-ok" : statusAtual === "nao-ok" ? null : "ok";
		atualizarCelula(botao, aluno, criterio);
		alterado = true;
		AppUI.notice("Alterações ainda não salvas.", false, feedback);
	});

	corpoTabela.addEventListener("keydown", (event) => {
		const nome = event.target.closest(".student-cell");
		if (!nome || (event.key !== "Enter" && event.key !== " ")) return;
		event.preventDefault();
		nome.click();
	});

	corpoTabela.addEventListener("change", (event) => {
		const checkbox = event.target.closest("[data-select-student]");
		if (!checkbox) return;
		const id = checkbox.dataset.selectStudent;
		if (checkbox.checked) selecionados.add(id);
		else selecionados.delete(id);
		atualizarSelecao();
	});

	selecionarTodos.addEventListener("change", () => {
		selecionados.clear();
		if (selecionarTodos.checked) {
			for (const aluno of alunosDaTurma()) selecionados.add(aluno.id);
		}
		atualizarSelecao();
	});

	limparSelecao.addEventListener("click", () => {
		selecionados.clear();
		atualizarSelecao();
	});

	// API para futuras funcionalidades. Retorna cópias para proteger o estado interno.
	// Exemplo: window.avaliacaoContexto.obterSelecionados()
	window.avaliacaoContexto = Object.freeze({
		obterSelecionados,
		obterCriteriosSelecionados: () => criterios.filter(({ id }) => criteriosSelecionados.has(id)).map((criterio) => ({ ...criterio })),
		obterAvaliacoes: () => alunosDaTurma().map(copiarAluno),
	});
	function carregarAvaliacao() {
		const registro = AppData.observations()[turmaAtual]?.[dataAtual];
		const matriculados = new Set(alunosDaTurma().map(a => a.id));
		for (const aluno of alunos) {
			const anterior = registro?.alunos.find(a => a.id === aluno.id);
			aluno.avaliacoes = Object.fromEntries(criterios.map(c => [c.id, anterior?.avaliacoes[c.id] || null]));
			const { linha } = linhas.get(aluno.id);
			linha.hidden = !matriculados.has(aluno.id);
			linha.querySelectorAll(".status-button").forEach(botao => atualizarCelula(botao, aluno, criteriosPorId.get(botao.dataset.criterionId)));
		}
		selecionados.clear();
		alterado = false;
		atualizarSelecao();
		document.getElementById("salvar-avaliacao").disabled = !turmaAtual || !dataAtual;
		AppUI.notice(turmaAtual ? (registro ? "Avaliação salva carregada." : "") : "Nenhuma turma ativa disponível.", !turmaAtual, feedback);
	}
	function mudarContexto() {
		if (alterado && !window.confirm("Há alterações não salvas. Deseja descartá-las e mudar a turma ou a data?")) {
			turmaControle.value = turmaAtual;
			dataControle.value = dataAtual;
			return;
		}
		turmaAtual = turmaControle.value;
		dataAtual = dataControle.value;
		carregarAvaliacao();
	}
	turmaControle.addEventListener("change", mudarContexto);
	dataControle.addEventListener("change", mudarContexto);
	document.getElementById("salvar-avaliacao").addEventListener("click", () => {
		try {
			AppData.saveObservation(turmaAtual, dataAtual, alunosDaTurma().map(copiarAluno));
			alterado = false;
			AppUI.notice("Avaliação salva e disponível no histórico.", false, feedback);
		} catch (error) { AppUI.notice(error.message, true, feedback); }
	});
	AppUI.registerUnsaved(() => alterado, () => { alterado = false; });
	carregarAvaliacao();
})();
