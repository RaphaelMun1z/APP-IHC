"use strict";

(() => {
	if (!window.AppUI?.user) return;
	const alunos = AppData.students;
	const chaveArmazenamento = "ipb-presencas-v1";
	const selecionados = new Set();
	const linhas = new Map();
	const lista = document.getElementById("lista-alunos");
	const cabecalho = document.getElementById("cabecalho-presencas");
	const turmaBotao = document.getElementById("turma-chamada-button");
	const turmaDropdown = document.getElementById("turma-chamada-dropdown");
	turmaDropdown.querySelector("ul").innerHTML = AppData.classes().map(turma => `<li><button type="button" data-turma-choice="${AppUI.esc(turma.id)}" class="app-dropdown-item">${AppUI.icon("book")}${AppUI.esc(turma.nome)}</button></li>`).join("");
	const turmaLabel = document.getElementById("turma-chamada-label");
	const mesChamada = document.getElementById("mes-chamada");
	const anoChamada = document.getElementById("ano-chamada");
	const statusSalvamento = document.getElementById("status-salvamento");
	const intervaloSemana = document.getElementById("intervalo-semana");
	const botaoBuscar = document.getElementById("buscar-chamada");
	const secaoTabela = document.getElementById("secao-tabela-presencas");
	let inicioSemana = null;
	let paginaSemana = 0;
	let dataReferencia = "";
	let turmaSelecionada = "";
	let buscaAplicada = false;
	let alunoEmHover = null;
	let dataEmHover = null;
	let registros = {};
	let houveAlteracao = false;
	const parametros = new URLSearchParams(location.search);
	let dataSolicitada = parametros.get("data") || "";
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSolicitada) || Number.isNaN(new Date(dataSolicitada + "T12:00:00").getTime())) dataSolicitada = "";

	function dataLocal() {
		const hoje = new Date();
		return [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, "0"), String(hoje.getDate()).padStart(2, "0")].join("-");
	}

	function converterData(valor) {
		return new Date(valor + "T12:00:00Z");
	}

	function formatarData(data) {
		return [data.getUTCFullYear(), String(data.getUTCMonth() + 1).padStart(2, "0"), String(data.getUTCDate()).padStart(2, "0")].join("-");
	}

	function somarDias(valor, quantidade) {
		const data = converterData(valor);
		data.setUTCDate(data.getUTCDate() + quantidade);
		return formatarData(data);
	}

	function segundaDaSemana(valor) {
		const data = converterData(valor);
		data.setUTCDate(data.getUTCDate() - data.getUTCDay());
		return formatarData(data);
	}

	function offsetDoMes() {
		if (!chaveMes()) return 0;
		const primeiroDia = converterData(chaveMes() + "-01");
		return primeiroDia.getUTCDay();
	}

	function paginasDoMes() {
		if (!chaveMes()) return 0;
		const partes = chaveMes().split("-").map(Number);
		const dias = new Date(partes[0], partes[1], 0).getDate();
		return Math.ceil((offsetDoMes() + dias) / 7);
	}

	function chaveMes() {
		return anoChamada.value && mesChamada.value ? anoChamada.value + "-" + mesChamada.value : "";
	}

	function dataInicialDoMes() {
		return chaveMes() ? chaveMes() + "-01" : "";
	}

	function primeiraDataVisivelDaPagina() {
		for (let indice = 0; indice < 7; indice++) {
			const data = somarDias(inicioSemana, indice);
			if (data.slice(0, 7) === chaveMes()) return data;
		}
		return dataInicialDoMes();
	}

	function atualizarSemanaDoMes() {
		if (!chaveMes()) return;
		const primeiraSegunda = segundaDaSemana(dataInicialDoMes());
		inicioSemana = somarDias(primeiraSegunda, paginaSemana * 7);
	}

	function ajustarLarguraColunas() {
		const larguraNome = cabecalho.querySelector(".student-cell").getBoundingClientRect().width || 224;
		const larguraDisponivel = document.getElementById("tabela-presencas").clientWidth;
		const larguraDia = Math.max(112, (larguraDisponivel - larguraNome) / 7);
		for (const celula of cabecalho.querySelectorAll(".attendance-day-heading")) {
			celula.style.width = larguraDia + "px";
			celula.style.minWidth = larguraDia + "px";
		}
		for (const celula of lista.querySelectorAll(".attendance-day-cell")) {
			celula.style.width = larguraDia + "px";
			celula.style.minWidth = larguraDia + "px";
		}
	}

	function paginaDaData(data) {
		return Math.floor((offsetDoMes() + Number(data.slice(-2)) - 1) / 7);
	}

	function rotuloData(data, opcoes) {
		return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: "UTC" }).format(new Date(data + "T12:00:00Z"));
	}

	function preencherMeses() {
		const anoAtual = Number(dataLocal().slice(0, 4));
		for (let mes = 1; mes <= 12; mes++) {
			const valor = String(mes).padStart(2, "0");
			const opcao = document.createElement("option");
			opcao.value = valor;
			opcao.textContent = rotuloData("2026-" + valor + "-01", { month: "long" });
			opcao.textContent = opcao.textContent.charAt(0).toLocaleUpperCase("pt-BR") + opcao.textContent.slice(1);
			mesChamada.append(opcao);
		}
		for (let ano = anoAtual - 5; ano <= anoAtual + 5; ano++) {
			const opcao = document.createElement("option");
			opcao.value = String(ano);
			opcao.textContent = String(ano);
			anoChamada.append(opcao);
		}
	}

	function registrosDaTurma() {
		return registros[turmaSelecionada] || {};
	}

	function atualizarContextoTabela() {
		const titulo = document.getElementById("contexto-mes");
		const contextoTurma = document.getElementById("contexto-turma");
		if (chaveMes()) {
			const mes = mesChamada.options[mesChamada.selectedIndex].text;
			titulo.textContent = mes + " de " + anoChamada.value;
		} else {
			titulo.textContent = turmaSelecionada ? "Selecione o ano e o mês" : "Selecione uma turma";
		}
		contextoTurma.textContent = turmaSelecionada ? "Turma " + turmaLabel.textContent.trim() : "";
	}

	function obterStatus(data, alunoId) {
		const turma = registrosDaTurma();
		return turma[data] && turma[data][alunoId] || null;
	}

	function atualizarBotao(botao) {
		const status = obterStatus(botao.dataset.date, botao.dataset.alunoId);
		botao.dataset.status = status || "pendente";
		botao.innerHTML = status === "presente"
			? '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
			: status === "falta"
				? '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>'
				: '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9 12h6"/></svg>';
		const aluno = alunos.find((item) => item.id === botao.dataset.alunoId);
		const descricoes = { presente: "presente", falta: "falta", pendente: "sem registro" };
		botao.setAttribute("aria-label", aluno.nome + ", " + rotuloData(botao.dataset.date) + ": " + descricoes[botao.dataset.status] + ". Clique para alternar.");
		botao.setAttribute("aria-pressed", String(Boolean(status)));
	}

	function atualizarDestaqueHover(botao) {
		alunoEmHover = botao ? botao.dataset.alunoId : null;
		dataEmHover = botao ? botao.dataset.date : null;
		for (const aluno of alunos) {
			const { linha } = linhas.get(aluno.id);
			linha.dataset.hoveredRow = String(aluno.id === alunoEmHover);
			for (const celula of linha.querySelectorAll(".attendance-day-cell")) {
				const celulaBotao = celula.querySelector(".attendance-day-button");
				celula.dataset.hoveredColumn = String(Boolean(dataEmHover && celulaBotao.dataset.date === dataEmHover));
			}
		}
		for (const th of cabecalho.querySelectorAll(".attendance-day-heading")) {
			th.dataset.hoveredColumn = String(Boolean(dataEmHover && th.dataset.date === dataEmHover));
		}
		document.dispatchEvent(new CustomEvent("presencas:celula-hover-alterada", { detail: { data: dataEmHover } }));
	}

	function atualizarSelecao() {
		for (const aluno of alunos) {
			const { linha } = linhas.get(aluno.id);
			linha.dataset.selected = String(selecionados.has(aluno.id));
		}
		document.dispatchEvent(new CustomEvent("presencas:selecao-alterada", { detail: { ids: [...selecionados] } }));
	}

	function renderizarStatusSalvamento(mensagem) {
		statusSalvamento.textContent = mensagem;
		statusSalvamento.classList.toggle("text-fg-warning", houveAlteracao);
		statusSalvamento.classList.toggle("text-body-subtle", !houveAlteracao);
	}

	function marcarAlterado() {
		houveAlteracao = true;
		renderizarStatusSalvamento("Há alterações não salvas.");
	}

	function renderizarDias() {
		if (alunoEmHover) atualizarDestaqueHover(null);
		const cabecalhosExistentes = [...cabecalho.querySelectorAll(".attendance-day-heading")];
		for (let dia = 0; dia < 7; dia++) {
			let th = cabecalhosExistentes[dia];
			if (!th) {
				th = document.createElement("th");
				th.scope = "col";
				th.className = "attendance-day-heading";
				cabecalho.append(th);
			}
			if (!buscaAplicada || !chaveMes() || !inicioSemana) {
				th.textContent = "";
				th.hidden = true;
				delete th.dataset.date;
				delete th.dataset.activeDate;
				continue;
			}
			const data = somarDias(inicioSemana, dia);
			const dentroDoMes = data.slice(0, 7) === chaveMes();
			const objetoData = converterData(data);
			const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(objetoData).replace(".", "");
			th.textContent = diaSemana + " " + String(objetoData.getUTCDate()).padStart(2, "0");
			th.setAttribute("aria-label", rotuloData(data, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
			th.title = "Selecionar " + th.getAttribute("aria-label");
			th.dataset.date = data;
			th.hidden = !dentroDoMes;
			if (data === dataLocal()) th.dataset.today = "true";
			else delete th.dataset.today;
			if (data === dataReferencia) th.dataset.activeDate = "true";
			else delete th.dataset.activeDate;
		}
		if (!buscaAplicada || !turmaSelecionada || !chaveMes()) {
			for (const aluno of alunos) {
				const { linha } = linhas.get(aluno.id);
				linha.querySelectorAll(".attendance-day-cell").forEach((celula) => celula.remove());
			}
			const tabela = cabecalho.closest(".attendance-table");
			tabela.classList.remove("w-full");
			tabela.classList.add("w-max");
			intervaloSemana.textContent = "";
			document.getElementById("semana-anterior").disabled = true;
			document.getElementById("semana-proxima").disabled = true;
			document.getElementById("semana-atual").disabled = true;
			atualizarContextoTabela();
			document.dispatchEvent(new CustomEvent("presencas:semana-alterada"));
			return;
		}
		document.getElementById("semana-atual").disabled = false;
		const diasVisiveis = [...cabecalho.querySelectorAll(".attendance-day-heading")].filter((th) => !th.hidden).length;
		const tabela = cabecalho.closest(".attendance-table");
		tabela.classList.toggle("w-full", diasVisiveis === 7);
		tabela.classList.toggle("w-max", diasVisiveis < 7);

		for (const aluno of alunos) {
			const { linha } = linhas.get(aluno.id);
			const celulasExistentes = [...linha.querySelectorAll(".attendance-day-cell")];
			for (let dia = 0; dia < 7; dia++) {
				const data = somarDias(inicioSemana, dia);
				const dentroDoMes = data.slice(0, 7) === chaveMes();
				let td = celulasExistentes[dia];
				if (!td) {
					td = document.createElement("td");
					td.className = "attendance-day-cell";
					const botao = document.createElement("button");
					botao.type = "button";
					botao.className = "attendance-day-button";
					botao.dataset.alunoId = aluno.id;
					td.append(botao);
					linha.append(td);
				}
				td.hidden = !dentroDoMes;
				if (data === dataLocal()) td.dataset.today = "true";
				else delete td.dataset.today;
				if (data === dataReferencia) td.dataset.activeDate = "true";
				else delete td.dataset.activeDate;
				const botao = td.querySelector(".attendance-day-button");
				botao.dataset.date = data;
				atualizarBotao(botao);
			}
		}
		ajustarLarguraColunas();
		const primeiraData = primeiraDataVisivelDaPagina();
		let fimData = primeiraData;
		for (let indice = 0; indice < 7; indice++) {
			const data = somarDias(inicioSemana, indice);
			if (data.slice(0, 7) === chaveMes()) fimData = data;
		}
		intervaloSemana.textContent = rotuloData(primeiraData, { day: "numeric" }) + "–" + rotuloData(fimData, { day: "numeric" }) + " · Semana " + (paginaSemana + 1) + " de " + paginasDoMes();
		atualizarContextoTabela();
		document.getElementById("semana-anterior").disabled = paginasDoMes() < 2;
		document.getElementById("semana-proxima").disabled = paginasDoMes() < 2;
		document.dispatchEvent(new CustomEvent("presencas:semana-alterada"));
	}

	function carregarRegistros() {
		try {
			const salvos = JSON.parse(localStorage.getItem(chaveArmazenamento) || "{}");
			if (salvos && typeof salvos === "object" && Object.keys(salvos).some((chave) => /^\d{4}-\d{2}-\d{2}$/.test(chave))) {
				registros = { "6a": salvos };
			} else {
				registros = salvos && typeof salvos === "object" ? salvos : {};
			}
			renderizarStatusSalvamento("");
		} catch {
			registros = {};
			renderizarStatusSalvamento("Não foi possível carregar os registros locais.");
		}
		houveAlteracao = false;
	}

	function salvarChamada() {
		try {
			if (!AppData.getClass(turmaSelecionada)?.ativa) throw new Error("Turma indisponível");
			localStorage.setItem(chaveArmazenamento, JSON.stringify(registros));
			houveAlteracao = false;
			renderizarStatusSalvamento("Chamada salva neste navegador.");
		} catch {
			houveAlteracao = true;
			renderizarStatusSalvamento("Não foi possível salvar os registros locais.");
		}
	}

	for (const aluno of alunos) {
		const linha = document.createElement("tr");
		linha.className = "evaluation-row";
		linha.dataset.studentId = aluno.id;
		linha.dataset.selected = "false";

		const nome = document.createElement("th");
		nome.className = "student-cell px-4 py-3 font-medium text-heading";
		nome.scope = "row";
		nome.textContent = aluno.nome;
		nome.tabIndex = 0;
		nome.setAttribute("aria-label", "Selecionar aluno " + aluno.nome);
		nome.setAttribute("aria-pressed", "false");
		linha.append(nome);
		linhas.set(aluno.id, { linha });
		lista.append(linha);
	}

	lista.addEventListener("click", (evento) => {
		const nome = evento.target.closest(".student-cell");
		if (nome) {
			const id = nome.closest("tr").dataset.studentId;
			if (selecionados.has(id)) selecionados.delete(id);
			else selecionados.add(id);
			atualizarSelecao();
			return;
		}
		const botao = evento.target.closest(".attendance-day-button");
		if (!botao) return;
		const data = botao.dataset.date;
		const alunoId = botao.dataset.alunoId;
		const atual = obterStatus(data, alunoId);
		const proximo = atual === null ? "presente" : atual === "presente" ? "falta" : null;
		registros[turmaSelecionada] ||= {};
		registros[turmaSelecionada][data] ||= {};
		if (proximo) registros[turmaSelecionada][data][alunoId] = proximo;
		else delete registros[turmaSelecionada][data][alunoId];
		if (!Object.keys(registros[turmaSelecionada][data]).length) delete registros[turmaSelecionada][data];
		atualizarBotao(botao);
		marcarAlterado();
	});

	lista.addEventListener("pointerover", (evento) => {
		const botao = evento.target.closest(".attendance-day-button");
		if (!botao) {
			if (alunoEmHover) atualizarDestaqueHover(null);
			return;
		}
		if (botao.dataset.alunoId === alunoEmHover && botao.dataset.date === dataEmHover) return;
		atualizarDestaqueHover(botao);
	});
	lista.addEventListener("pointerout", (evento) => {
		if (!lista.contains(evento.relatedTarget) && alunoEmHover) atualizarDestaqueHover(null);
	});

	lista.addEventListener("keydown", (evento) => {
		const nome = evento.target.closest(".student-cell");
		if (nome && (evento.key === "Enter" || evento.key === " ")) {
			evento.preventDefault();
			nome.click();
		}
	});

	document.getElementById("salvar-chamada").addEventListener("click", salvarChamada);
	function invalidarBusca() {
		buscaAplicada = false;
		dataReferencia = "";
		paginaSemana = 0;
		secaoTabela.hidden = true;
		botaoBuscar.disabled = !(turmaSelecionada && anoChamada.value && mesChamada.value);
		renderizarDias();
	}
	mesChamada.addEventListener("change", invalidarBusca);
	anoChamada.addEventListener("change", () => {
		mesChamada.value = "";
		mesChamada.disabled = !(turmaSelecionada && anoChamada.value);
		invalidarBusca();
	});
	document.querySelectorAll("[data-turma-choice]").forEach((opcao) => {
		opcao.setAttribute("aria-pressed", "false");
		opcao.addEventListener("click", () => {
			turmaSelecionada = opcao.dataset.turmaChoice;
			turmaLabel.textContent = opcao.textContent.trim();
			turmaBotao.setAttribute("aria-label", "Selecionar turma. Selecionada: " + turmaLabel.textContent);
			document.querySelectorAll("[data-turma-choice]").forEach((item) => item.setAttribute("aria-pressed", String(item === opcao)));
			window.FlowbiteInstances?.getInstance("Dropdown", "turma-chamada-dropdown")?.hide();
			turmaDropdown.classList.add("hidden");
			turmaBotao.setAttribute("aria-expanded", "false");
			anoChamada.disabled = false;
			anoChamada.value = "";
			mesChamada.disabled = true;
			mesChamada.value = "";
			buscaAplicada = false;
			secaoTabela.hidden = true;
			botaoBuscar.disabled = true;
			dataReferencia = "";
			paginaSemana = 0;
			selecionados.clear();
			for (const aluno of alunos) linhas.get(aluno.id).linha.hidden = !AppData.getClass(turmaSelecionada)?.alunoIds.includes(aluno.id);
			atualizarSelecao();
			lista.querySelectorAll(".attendance-day-button").forEach(atualizarBotao);
			renderizarDias();
			atualizarContextoTabela();
		});
	});
	botaoBuscar.addEventListener("click", () => {
		if (!turmaSelecionada || !anoChamada.value || !mesChamada.value) return;
		buscaAplicada = true;
		secaoTabela.hidden = false;
		dataReferencia = dataSolicitada.startsWith(chaveMes()) ? dataSolicitada : chaveMes() === dataLocal().slice(0, 7) ? dataLocal() : chaveMes() + "-01";
		dataSolicitada = "";
		paginaSemana = paginaDaData(dataReferencia);
		atualizarSemanaDoMes();
		renderizarDias();
	});
	document.getElementById("semana-anterior").addEventListener("click", () => {
		const totalPaginas = paginasDoMes();
		if (totalPaginas < 2) return;
		paginaSemana = (paginaSemana - 1 + totalPaginas) % totalPaginas;
		atualizarSemanaDoMes();
		dataReferencia = primeiraDataVisivelDaPagina();
		renderizarDias();
	});
	document.getElementById("semana-proxima").addEventListener("click", () => {
		const totalPaginas = paginasDoMes();
		if (totalPaginas < 2) return;
		paginaSemana = (paginaSemana + 1) % totalPaginas;
		atualizarSemanaDoMes();
		dataReferencia = primeiraDataVisivelDaPagina();
		renderizarDias();
	});
	document.getElementById("semana-atual").addEventListener("click", () => {
		if (!buscaAplicada || !turmaSelecionada || !chaveMes()) return;
		dataReferencia = dataLocal();
		anoChamada.value = dataReferencia.slice(0, 4);
		mesChamada.value = dataReferencia.slice(5, 7);
		mesChamada.disabled = false;
		paginaSemana = paginaDaData(dataReferencia);
		atualizarSemanaDoMes();
		renderizarDias();
	});
	window.addEventListener("resize", ajustarLarguraColunas);
	cabecalho.addEventListener("click", (evento) => {
		const coluna = evento.target.closest(".attendance-day-heading");
		if (!coluna || coluna.hidden || !coluna.dataset.date) return;
		dataReferencia = coluna.dataset.date;
		renderizarDias();
	});
	preencherMeses();
	dataReferencia = "";
	buscaAplicada = false;
	secaoTabela.hidden = true;
	mesChamada.value = "";
	anoChamada.value = "";
	carregarRegistros();
	renderizarDias();
	atualizarSelecao();
	AppUI.registerUnsaved(() => houveAlteracao, () => { houveAlteracao = false; });
	// Pré-seleção contextual, mantendo a abertura da tabela somente após Buscar.
	document.addEventListener("DOMContentLoaded", () => {
		const turma = AppData.classes().find(t => t.id === parametros.get("turma"));
		if (!turma) return;
		[...document.querySelectorAll("[data-turma-choice]")].find(b => b.dataset.turmaChoice === turma.id)?.click();
		const data = dataSolicitada || dataLocal();
		if (![...anoChamada.options].some(o => o.value === data.slice(0, 4))) anoChamada.add(new Option(data.slice(0, 4), data.slice(0, 4)));
		anoChamada.value = data.slice(0, 4);
		anoChamada.dispatchEvent(new Event("change"));
		mesChamada.value = data.slice(5, 7);
		mesChamada.dispatchEvent(new Event("change"));
	});
})();
